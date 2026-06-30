import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv();

const ROOT = process.cwd();
const DRY_RUN = process.argv.includes("--dry-run");

const CLAUDE_MODEL = "claude-sonnet-4-6";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

const DESIGN_PATH = "docs/DESIGN.md";
const GLOBALS_PATH = "app/globals.css";
const COLORS_STORY = "stories/foundation/Colors.stories.tsx";
const TYPOGRAPHY_STORY = "stories/foundation/Typography.stories.tsx";
const SPACING_STORY = "stories/foundation/Spacing.stories.tsx";
const ORPHAN_BACKLOG_PATH = "docs/orphan-components.md";
const TOKEN_DRIFT_BACKLOG_PATH = "docs/token-drift-warnings.md";

const STORY_CATEGORY_PREFIX: Record<string, string> = {
  foundation: "1. Foundation",
  navigation: "2. Navigation",
  controls: "3. Controls",
  "data-display": "4. Data Display",
  layouts: "5. Layouts",
};

type DsSyncAction =
  | {
      type: "update_design_md";
      token: string;
      value: string;
      section?: string;
      usage?: string;
    }
  | {
      type: "update_globals_css";
      token: string;
      value: string;
    }
  | {
      type: "update_story";
      target: "colors";
      name?: string;
      usage?: string;
      sample?: string;
    }
  | {
      type: "update_story";
      target: "typography";
      className?: string;
      usage?: string;
      sample?: string;
      context?: string;
    }
  | {
      type: "update_story";
      target: "spacing";
      name?: string;
      usage?: string;
    }
  | {
      type: "update_story";
      target: "component";
      componentPath?: string;
      storyCategory?: keyof typeof STORY_CATEGORY_PREFIX;
    }
  | {
      type: "run_a11y_test";
      storyPath?: string;
    }
  | {
      type: "flag_orphan_component";
      componentName: string;
      componentPath: string;
      storyPath?: string;
      reason?: string;
    };

interface OrphanComponentFlag {
  componentName: string;
  componentPath: string;
  storyPath: string;
  reason?: string;
}

interface TokenDriftFlag {
  selector: string;
  property: string;
  value: string;
  snippet: string;
}

interface CssDiffParserState {
  selector: string;
  inRoot: boolean;
  depth: number;
}

const modifiedFiles = new Set<string>();
const flaggedOrphanPaths = new Set<string>();
const flaggedTokenDriftKeys = new Set<string>();

function log(message: string): void {
  console.log(`[ds-sync] ${message}`);
}

function runGit(args: string[]): string {
  const result = spawnSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  }
  return (result.stdout ?? "").trim();
}

interface A11yViolationReport {
  storyFile: string;
  storyPath: string;
  storyName: string;
  rule: string;
  foundRatio?: string;
  requiredRatio?: string;
  foregroundColor?: string;
  backgroundColor?: string;
  elementClasses: string[];
  likelyCause?: string;
}

const KNOWN_COMPOSITE_BACKGROUNDS: Record<string, string> = {
  "#f5f3f0": "--color-bg-content-to + --color-signal-s2-bg",
};

let cssColorTokenMap: Map<string, string[]> | null = null;
let cssClassColorTokenMap: Map<string, string> | null = null;

function normalizeHexColor(color: string): string | null {
  const trimmed = color.trim().toLowerCase();
  if (!trimmed.startsWith("#")) {
    return null;
  }
  if (trimmed.length === 4) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
  }
  return trimmed;
}

function loadCssColorTokenMap(): Map<string, string[]> {
  if (cssColorTokenMap) {
    return cssColorTokenMap;
  }

  const map = new Map<string, string[]>();
  const content = readProjectFile(GLOBALS_PATH);
  const tokenPattern = /(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/g;
  let match: RegExpExecArray | null = tokenPattern.exec(content);

  while (match) {
    const token = match[1];
    const rawValue = match[2];
    if (token && rawValue.startsWith("#")) {
      const normalized = normalizeHexColor(rawValue);
      if (normalized) {
        const existing = map.get(normalized) ?? [];
        existing.push(token);
        map.set(normalized, existing);
      }
    }
    match = tokenPattern.exec(content);
  }

  cssColorTokenMap = map;
  return map;
}

function loadCssClassColorTokenMap(): Map<string, string> {
  if (cssClassColorTokenMap) {
    return cssClassColorTokenMap;
  }

  const map = new Map<string, string>();
  const content = readProjectFile(GLOBALS_PATH);
  const classPattern = /\.([\w-]+)\s*\{[\s\S]*?\bcolor:\s*var\((--[\w-]+)\)/g;
  let classMatch: RegExpExecArray | null = classPattern.exec(content);

  while (classMatch) {
    const className = classMatch[1];
    const token = classMatch[2];
    if (className && token) {
      map.set(className, token);
    }
    classMatch = classPattern.exec(content);
  }

  cssClassColorTokenMap = map;
  return map;
}

function tokenLabelForHex(hex: string | undefined): string | undefined {
  if (!hex) {
    return undefined;
  }
  const normalized = normalizeHexColor(hex);
  if (!normalized) {
    return undefined;
  }

  const composite = KNOWN_COMPOSITE_BACKGROUNDS[normalized];
  if (composite) {
    return composite;
  }

  const tokens = loadCssColorTokenMap().get(normalized);
  if (!tokens || tokens.length === 0) {
    return normalized;
  }
  return tokens[0];
}

function inferLikelyA11yCause(report: A11yViolationReport): string | undefined {
  const classTokens = report.elementClasses
    .map((className) => loadCssClassColorTokenMap().get(className))
    .filter((token): token is string => Boolean(token));

  const foregroundToken =
    classTokens[0] ?? tokenLabelForHex(report.foregroundColor) ?? report.foregroundColor;
  const backgroundToken = tokenLabelForHex(report.backgroundColor) ?? report.backgroundColor;

  if (foregroundToken && backgroundToken) {
    return `${foregroundToken} on ${backgroundToken}`;
  }
  if (foregroundToken) {
    return foregroundToken;
  }
  return undefined;
}

function parseA11yFailuresFromTestOutput(output: string): A11yViolationReport[] {
  const failures: A11yViolationReport[] = [];
  const chunks = output.split(/^FAIL browser:/m).slice(1);

  for (const chunk of chunks) {
    const storyFileMatch = chunk.match(/^\s*chromium\s+(\S+\.stories\.tsx)/);
    if (!storyFileMatch?.[1]) {
      continue;
    }

    const storyFile = storyFileMatch[1];
    const storyLineMatch = chunk.match(/^\s*●\s+(.+?)\s+›\s+(.+?)\s+›/m);
    const storyPath = storyLineMatch?.[1]?.trim() ?? storyFile;
    const storyName = storyLineMatch?.[2]?.trim() ?? "unknown";

    const ruleMatch = chunk.match(/\(([\w-]+)\)\s*$/m) ??
      chunk.match(/"[^"]*\(([\w-]+)\)"/);
    const contrastMatch = chunk.match(/insufficient color contrast of ([\d.]+)/i);
    const requiredMatch = chunk.match(/Expected contrast ratio of ([\d.]+):1/i);
    const colorsMatch = chunk.match(
      /foreground color:\s*(#[0-9a-fA-F]{3,8})[\s\S]*?background color:\s*(#[0-9a-fA-F]{3,8})/i,
    );
    const classMatch = chunk.match(/class="([^"]+)"/);

    const elementClasses = classMatch?.[1]?.split(/\s+/).filter(Boolean) ?? [];
    const report: A11yViolationReport = {
      storyFile,
      storyPath,
      storyName,
      rule: ruleMatch?.[1] ?? "unknown",
      foundRatio: contrastMatch?.[1],
      requiredRatio: requiredMatch?.[1],
      foregroundColor: colorsMatch?.[1],
      backgroundColor: colorsMatch?.[2],
      elementClasses,
    };
    report.likelyCause = inferLikelyA11yCause(report);
    failures.push(report);
  }

  return failures;
}

function printA11yRegressionReport(failures: A11yViolationReport[]): void {
  if (failures.length === 0) {
    return;
  }

  console.error("\n⛔ Commit blocked: accessibility regression detected\n");

  failures.forEach((failure, index) => {
    if (index > 0) {
      console.error("");
    }
    console.error(`Story: ${failure.storyPath} → ${failure.storyName}`);
    console.error(`Rule: ${failure.rule}`);
    if (failure.foundRatio && failure.requiredRatio) {
      console.error(`Found: ${failure.foundRatio}:1 (needs ${failure.requiredRatio}:1)`);
    } else if (failure.foundRatio) {
      console.error(`Found: ${failure.foundRatio}:1`);
    }
    if (failure.foregroundColor || failure.backgroundColor) {
      const fg = failure.foregroundColor ?? "unknown";
      const bg = failure.backgroundColor ?? "unknown";
      console.error(`Colors: ${fg} on ${bg}`);
    }
    if (failure.elementClasses.length > 0) {
      console.error(`Element: .${failure.elementClasses.join(".")}`);
    }
    if (failure.likelyCause) {
      console.error(`Likely cause: ${failure.likelyCause}`);
    }
  });

  console.error(
    "\nFix the token value and re-commit, or run with --no-verify to bypass (not recommended).\n",
  );
}

function runA11yOnlyMode(): void {
  const passed = runTestStorybook();
  process.exit(passed ? 0 : 1);
}

function runParseA11yFixtureMode(): void {
  const fixturePath = getArg("--parse-a11y-output");
  if (!fixturePath) {
    throw new Error("--parse-a11y-output requires a fixture file path");
  }

  const output = readProjectFile(fixturePath);
  const failures = parseA11yFailuresFromTestOutput(output);
  if (failures.length === 0) {
    console.error("[ds-sync] no accessibility violations parsed from fixture");
    process.exit(1);
  }

  printA11yRegressionReport(failures);
  process.exit(1);
}

function getArg(flag: string): string | undefined {
  const withEquals = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  if (withEquals) {
    return withEquals.slice(flag.length + 1);
  }
  const index = process.argv.indexOf(flag);
  if (index !== -1 && process.argv[index + 1]) {
    return process.argv[index + 1];
  }
  return undefined;
}

function isDesignRelevant(file: string): boolean {
  if (file === GLOBALS_PATH || file === DESIGN_PATH) {
    return true;
  }
  return /^components\/.*\.tsx$/.test(file);
}

function isOrphanDetectionRelevant(file: string): boolean {
  return /^(app|components)\/.*\.tsx$/.test(file);
}

function isRuntimePageFile(file: string): boolean {
  return isOrphanDetectionRelevant(file);
}

function getStagedFiles(): string[] {
  const stagedFilesArg = getArg("--staged-files");
  if (stagedFilesArg) {
    return readProjectFile(stagedFilesArg)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  const output = runGit(["diff", "--cached", "--name-only"]);
  if (!output) {
    return [];
  }
  return output.split("\n").filter(Boolean);
}

function getStagedDiff(): string {
  const diffFile = getArg("--diff-file");
  if (diffFile) {
    return readProjectFile(diffFile);
  }
  return runGit(["diff", "--cached"]);
}

function readProjectFile(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

function writeProjectFile(path: string, content: string): void {
  if (DRY_RUN) {
    log(`[dry-run] would write ${path}`);
    return;
  }
  writeFileSync(join(ROOT, path), content, "utf8");
  modifiedFiles.add(path);
}

function getAnthropicApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) {
    throw new Error("Missing ANTHROPIC_API_KEY in environment (.env.local)");
  }
  return key;
}

function extractJsonArray(text: string): DsSyncAction[] {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1]?.trim() ?? text.trim();
  const start = candidate.indexOf("[");
  const end = candidate.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Claude response did not contain a JSON array of actions");
  }
  const parsed = JSON.parse(candidate.slice(start, end + 1)) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Claude response JSON must be an array");
  }
  return parsed as DsSyncAction[];
}

async function callClaude(diff: string, changedFiles: string[]): Promise<DsSyncAction[]> {
  const prompt = `You are a design system agent. Analyze this git diff and identify any design changes: new CSS tokens, modified token values, new components, modified component styles. For each change found, output a JSON array of actions needed to keep the design system in sync.

Changed files:
${changedFiles.map((file) => `- ${file}`).join("\n")}

Return ONLY a JSON array (no prose). Each action must use one of these types:

1. update_story — sync Storybook foundation or component stories
   - target "colors": { "type":"update_story", "target":"colors", "name":"--color-token-name", "usage":"...", "sample":"bg"|"text"|"border" }
   - target "typography": { "type":"update_story", "target":"typography", "className":"text-class-name", "sample":"Example text", "context":"..." }
   - target "spacing": { "type":"update_story", "target":"spacing", "name":"--spacing-token-name", "usage":"..." }
   - target "component": { "type":"update_story", "target":"component", "componentPath":"components/Example.tsx", "storyCategory":"controls"|"navigation"|"data-display"|"layouts" }

2. update_design_md — when a token VALUE changed in globals.css
   { "type":"update_design_md", "token":"--color-token-name", "value":"#hex", "section":"Base"|"Accent"|"Sidebar text tokens", "usage":"..." }

3. update_globals_css — when DESIGN.md defines a token missing from globals.css
   { "type":"update_globals_css", "token":"--color-token-name", "value":"#hex" }

4. run_a11y_test — when component stories were created or meaningfully changed
   { "type":"run_a11y_test", "storyPath":"stories/controls/Example.stories.tsx" }

5. flag_orphan_component — when a component is no longer imported in runtime app code but its files remain
   { "type":"flag_orphan_component", "componentName":"StatGrid", "componentPath":"components/StatGrid.tsx", "storyPath":"stories/data-display/StatGrid.stories.tsx", "reason":"All imports removed from /app and /components page files in this diff" }

Rules:
- New --color-* in globals.css → update_story colors (do not duplicate existing tokens)
- New .text-* class in globals.css → update_story typography
- New --spacing-* in globals.css → update_story spacing
- New component .tsx in components/ without a matching stories file → update_story component
- Modified token value in globals.css → update_design_md
- If the diff shows all imports of a component being removed from /app and /components page files, but the component file and its story are not deleted in this same diff, and the component has no remaining runtime imports, emit flag_orphan_component (warning only — never delete files automatically)
- Return [] if no sync actions are needed

Git diff:
\`\`\`diff
${diff}
\`\`\``;

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getAnthropicApiKey(),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Claude API error ${response.status}: ${body}`);
  }

  const payload = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = payload.content?.find((block) => block.type === "text")?.text;
  if (!text) {
    throw new Error("Claude API returned no text content");
  }

  return extractJsonArray(text);
}

function inferColorSample(tokenName: string): "text" | "border" | "bg" {
  if (tokenName.includes("text")) {
    return "text";
  }
  if (tokenName.includes("border")) {
    return "border";
  }
  return "bg";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function listTsxFilesUnder(relativeDir: string): string[] {
  const absoluteDir = join(ROOT, relativeDir);
  if (!existsSync(absoluteDir)) {
    return [];
  }

  const results: string[] = [];
  for (const entry of readdirSync(absoluteDir, { withFileTypes: true })) {
    const relativePath = `${relativeDir}/${entry.name}`.replace(/\\/g, "/");
    if (entry.isDirectory()) {
      results.push(...listTsxFilesUnder(relativePath));
      continue;
    }
    if (entry.name.endsWith(".tsx")) {
      results.push(relativePath);
    }
  }
  return results;
}

function normalizeRepoPath(path: string): string {
  const parts: string[] = [];
  for (const segment of path.replace(/\\/g, "/").split("/")) {
    if (!segment || segment === ".") {
      continue;
    }
    if (segment === "..") {
      parts.pop();
      continue;
    }
    parts.push(segment);
  }
  return parts.join("/");
}

function resolveComponentPath(importSource: string, fromFile: string): string | null {
  if (importSource.startsWith("@/")) {
    const withoutAlias = importSource.slice(2);
    return withoutAlias.endsWith(".tsx") ? withoutAlias : `${withoutAlias}.tsx`;
  }

  if (!importSource.startsWith(".")) {
    return null;
  }

  const resolved = normalizeRepoPath(join(dirname(fromFile), importSource));
  return resolved.endsWith(".tsx") ? resolved : `${resolved}.tsx`;
}

function parseRemovedImportsFromDiff(
  diff: string,
): Array<{ fromFile: string; importSource: string }> {
  const results: Array<{ fromFile: string; importSource: string }> = [];
  let currentFile: string | null = null;

  for (const line of diff.split("\n")) {
    if (line.startsWith("+++ b/")) {
      currentFile = line.slice("+++ b/".length);
      continue;
    }
    if (!currentFile || !line.startsWith("-import ")) {
      continue;
    }

    const match = line.match(/^-import\s+(?:\{[^}]*\}|\w+)\s+from\s+["']([^"']+)["']/);
    if (match?.[1]) {
      results.push({ fromFile: currentFile, importSource: match[1] });
    }
  }

  return results;
}

function isFileDeletedInDiff(diff: string, filePath: string): boolean {
  const pattern = new RegExp(
    `^diff --git a/${escapeRegExp(filePath)} b/dev/null$`,
    "m",
  );
  return pattern.test(diff);
}

function findStoryPath(componentName: string): string | null {
  for (const relativePath of listTsxFilesUnder("stories")) {
    if (basename(relativePath) === `${componentName}.stories.tsx`) {
      return relativePath;
    }
  }
  return null;
}

function fileReferencesComponent(
  filePath: string,
  componentPath: string,
  componentName: string,
): boolean {
  const content = readProjectFile(filePath);
  const importPath = componentPath.replace(/\.tsx$/, "");
  const patterns = [
    new RegExp(`from\\s+["']@/${escapeRegExp(importPath)}["']`),
    new RegExp(`from\\s+["'][^"']*${escapeRegExp(componentName)}["']`),
    new RegExp(`import\\s+\\{[^}]*\\b${escapeRegExp(componentName)}\\b[^}]*\\}\\s+from`),
  ];
  return patterns.some((pattern) => pattern.test(content));
}

function countRuntimeReferences(componentPath: string, componentName: string): number {
  const runtimeFiles = [...listTsxFilesUnder("app"), ...listTsxFilesUnder("components")];
  let count = 0;

  for (const filePath of runtimeFiles) {
    if (filePath === componentPath) {
      continue;
    }
    if (fileReferencesComponent(filePath, componentPath, componentName)) {
      count += 1;
    }
  }

  return count;
}

function detectOrphanComponentsFromDiff(
  diff: string,
  stagedFiles: string[],
): OrphanComponentFlag[] {
  const removedImports = parseRemovedImportsFromDiff(diff);
  const candidatePaths = new Set<string>();

  for (const { fromFile, importSource } of removedImports) {
    if (!isRuntimePageFile(fromFile)) {
      continue;
    }

    const componentPath = resolveComponentPath(importSource, fromFile);
    if (!componentPath?.startsWith("components/")) {
      continue;
    }

    candidatePaths.add(componentPath);
  }

  const orphans: OrphanComponentFlag[] = [];

  for (const componentPath of Array.from(candidatePaths)) {
    if (!existsSync(join(ROOT, componentPath))) {
      continue;
    }
    if (isFileDeletedInDiff(diff, componentPath)) {
      continue;
    }

    const componentName = basename(componentPath, ".tsx");
    if (countRuntimeReferences(componentPath, componentName) > 0) {
      continue;
    }

    const storyPath = findStoryPath(componentName);
    if (!storyPath || !existsSync(join(ROOT, storyPath))) {
      continue;
    }
    if (isFileDeletedInDiff(diff, storyPath)) {
      continue;
    }

    orphans.push({
      componentName,
      componentPath,
      storyPath,
      reason:
        "Component import removed from /app or /components page files; no remaining runtime references",
    });
  }

  return orphans;
}

function formatOrphanWarning(flag: OrphanComponentFlag): string {
  return (
    `⚠️ Component '${flag.componentName}' is no longer used in /app or /components ` +
    `but its file and Storybook story still exist. Consider removing ` +
    `${flag.componentPath} and ${flag.storyPath}`
  );
}

function appendOrphanBacklog(flag: OrphanComponentFlag): void {
  const detectedAt = new Date().toISOString().slice(0, 10);
  const header = `# Orphan component backlog

Auto-detected by \`scripts/ds-sync-agent.ts\`. Components no longer imported in \`/app\` or \`/components\` but whose component file and Storybook story still exist.

| Detected | Component | Component file | Story file | Notes |
| --- | --- | --- | --- | --- |
`;

  let content = existsSync(join(ROOT, ORPHAN_BACKLOG_PATH))
    ? readProjectFile(ORPHAN_BACKLOG_PATH)
    : header;

  if (!content.includes("| Detected | Component |")) {
    content = `${content.trim()}\n\n${header.trim()}\n`;
  }

  const row = `| ${detectedAt} | ${flag.componentName} | \`${flag.componentPath}\` | \`${flag.storyPath}\` | ${flag.reason ?? "Orphaned runtime import"} |`;
  const rowPattern = new RegExp(
    `\\|\\s*[^|]+\\s*\\|\\s*${escapeRegExp(flag.componentName)}\\s*\\|`,
  );

  if (rowPattern.test(content)) {
    content = content.replace(
      new RegExp(`\\|\\s*\\d{4}-\\d{2}-\\d{2}\\s*\\|\\s*${escapeRegExp(flag.componentName)}\\s*\\|[^\\n]*`),
      row,
    );
  } else {
    content = `${content.trim()}\n${row}\n`;
  }

  writeProjectFile(ORPHAN_BACKLOG_PATH, content);
}

function flagOrphanComponent(
  action: Extract<DsSyncAction, { type: "flag_orphan_component" }>,
): void {
  if (flaggedOrphanPaths.has(action.componentPath)) {
    return;
  }
  flaggedOrphanPaths.add(action.componentPath);

  const storyPath =
    action.storyPath ?? findStoryPath(action.componentName) ?? `stories/.../${action.componentName}.stories.tsx`;
  const flag: OrphanComponentFlag = {
    componentName: action.componentName,
    componentPath: action.componentPath,
    storyPath,
    reason: action.reason,
  };

  const warning = formatOrphanWarning(flag);
  console.warn(`[ds-sync] ${warning}`);

  if (DRY_RUN) {
    log(`[dry-run] would append orphan backlog entry for ${action.componentPath}`);
    return;
  }

  appendOrphanBacklog(flag);
}

function runOrphanDetection(diff: string, stagedFiles: string[]): void {
  const orphans = detectOrphanComponentsFromDiff(diff, stagedFiles);
  if (orphans.length === 0) {
    log("no orphan components detected");
    return;
  }

  log(`detected ${orphans.length} potential orphan component(s)`);
  for (const orphan of orphans) {
    flagOrphanComponent({
      type: "flag_orphan_component",
      componentName: orphan.componentName,
      componentPath: orphan.componentPath,
      storyPath: orphan.storyPath,
      reason: orphan.reason,
    });
  }
}

function createCssDiffParserState(): CssDiffParserState {
  return { selector: "", inRoot: false, depth: 0 };
}

function parseCssDeclarations(chunk: string): Array<{ property: string; value: string }> {
  const results: Array<{ property: string; value: string }> = [];
  for (const part of chunk.split(";")) {
    const match = part.match(/^\s*([\w-]+)\s*:\s*(.+)$/);
    if (!match || match[1].startsWith("--")) {
      continue;
    }
    results.push({ property: match[1], value: match[2].trim() });
  }
  return results;
}

function hasHardcodedDriftValue(property: string, value: string): boolean {
  if (/\bvar\s*\(/.test(value)) {
    return false;
  }
  if (/#[0-9a-fA-F]{3,8}\b/.test(value)) {
    return true;
  }
  if (/\d+px\b/.test(value)) {
    return true;
  }
  if (/\d+ms\b/.test(value)) {
    return true;
  }
  if (
    /\d*\.?\d+s\b/.test(value) &&
    /^(transition(-[\w-]+)?|animation(-[\w-]+)?)$/i.test(property)
  ) {
    return true;
  }
  return false;
}

function applyCssLineToParserState(state: CssDiffParserState, content: string): void {
  const openCount = (content.match(/\{/g) ?? []).length;
  const closeCount = (content.match(/\}/g) ?? []).length;
  const braceOpenIdx = content.indexOf("{");

  if (braceOpenIdx !== -1) {
    const selectorPart = content.slice(0, braceOpenIdx).trim();
    if (selectorPart && !selectorPart.startsWith("@")) {
      state.selector = selectorPart.replace(/,$/, "").trim();
      state.inRoot = state.selector === ":root";
    }
  }

  state.depth += openCount - closeCount;
  if (state.depth <= 0) {
    state.depth = 0;
    state.selector = "";
    state.inRoot = false;
  }
}

function collectTokenDriftFromDeclarations(
  declarations: Array<{ property: string; value: string }>,
  selector: string,
  warnings: TokenDriftFlag[],
  seen: Set<string>,
): void {
  for (const { property, value } of declarations) {
    if (!hasHardcodedDriftValue(property, value)) {
      continue;
    }

    const snippet = `${selector} { ${property}: ${value} }`;
    const key = snippet;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    warnings.push({
      selector,
      property,
      value,
      snippet,
    });
  }
}

function inspectCssDiffLineForTokenDrift(
  content: string,
  state: CssDiffParserState,
  isAddition: boolean,
  warnings: TokenDriftFlag[],
  seen: Set<string>,
): void {
  const inlineRule = content.match(/([.#:[\w][^{]*)\{([^}]*)\}/);
  if (inlineRule) {
    const selector = inlineRule[1].trim();
    const declarations = parseCssDeclarations(inlineRule[2]);
    if (isAddition && selector !== ":root") {
      collectTokenDriftFromDeclarations(declarations, selector, warnings, seen);
    }
    applyCssLineToParserState(state, content);
    return;
  }

  const declarations = parseCssDeclarations(content);
  if (isAddition && declarations.length > 0 && state.selector && !state.inRoot) {
    collectTokenDriftFromDeclarations(declarations, state.selector, warnings, seen);
  }

  applyCssLineToParserState(state, content);
}

function detectTokenDriftFromGlobalsCssDiff(diff: string): TokenDriftFlag[] {
  const warnings: TokenDriftFlag[] = [];
  const seen = new Set<string>();
  let trackingGlobals = false;
  const state = createCssDiffParserState();

  for (const line of diff.split("\n")) {
    if (line.startsWith("diff --git ")) {
      trackingGlobals = line.includes(GLOBALS_PATH);
      state.selector = "";
      state.inRoot = false;
      state.depth = 0;
      continue;
    }
    if (!trackingGlobals) {
      continue;
    }
    if (
      line.startsWith("+++") ||
      line.startsWith("---") ||
      line.startsWith("@@") ||
      line.startsWith("\\")
    ) {
      continue;
    }

    const prefix = line[0];
    if (prefix !== "+" && prefix !== " ") {
      continue;
    }

    inspectCssDiffLineForTokenDrift(
      line.slice(1),
      state,
      prefix === "+",
      warnings,
      seen,
    );
  }

  return warnings;
}

function formatTokenDriftWarning(flag: TokenDriftFlag): string {
  return (
    `⚠️ Hardcoded value detected in ${GLOBALS_PATH}: "${flag.snippet}" — ` +
    `consider using a design token (var(--color-*)) instead, or adding this as a new token ` +
    `if it's a deliberate new value.`
  );
}

function appendTokenDriftBacklog(flag: TokenDriftFlag): void {
  const detectedAt = new Date().toISOString().slice(0, 10);
  const header = `# Token drift warnings

Auto-detected by \`scripts/ds-sync-agent.ts\`. Hardcoded hex colors, px lengths, or ms/s timings added in \`app/globals.css\` instead of design tokens (\`var(--*)\`).

| Detected | Selector | Property | Value | Snippet |
| --- | --- | --- | --- | --- |
`;

  let content = existsSync(join(ROOT, TOKEN_DRIFT_BACKLOG_PATH))
    ? readProjectFile(TOKEN_DRIFT_BACKLOG_PATH)
    : header;

  if (!content.includes("| Detected | Selector |")) {
    content = `${content.trim()}\n\n${header.trim()}\n`;
  }

  const escapedSnippet = flag.snippet.replace(/\|/g, "\\|");
  const row =
    `| ${detectedAt} | \`${flag.selector}\` | \`${flag.property}\` | \`${flag.value}\` | \`${escapedSnippet}\` |`;
  const rowPattern = new RegExp(
    `\\|\\s*[^|]+\\s*\\|\\s*\`${escapeRegExp(flag.selector)}\`\\s*\\|\\s*\`${escapeRegExp(flag.property)}\`\\s*\\|`,
  );

  if (rowPattern.test(content)) {
    content = content.replace(
      new RegExp(
        `\\|\\s*\\d{4}-\\d{2}-\\d{2}\\s*\\|\\s*\`${escapeRegExp(flag.selector)}\`\\s*\\|\\s*\`${escapeRegExp(flag.property)}\`\\s*\\|[^\\n]*`,
      ),
      row,
    );
  } else {
    content = `${content.trim()}\n${row}\n`;
  }

  writeProjectFile(TOKEN_DRIFT_BACKLOG_PATH, content);
}

function flagTokenDrift(flag: TokenDriftFlag): void {
  const key = flag.snippet;
  if (flaggedTokenDriftKeys.has(key)) {
    return;
  }
  flaggedTokenDriftKeys.add(key);

  const warning = formatTokenDriftWarning(flag);
  console.warn(`[ds-sync] ${warning}`);

  if (DRY_RUN) {
    log(`[dry-run] would append token drift backlog entry for ${flag.snippet}`);
    return;
  }

  appendTokenDriftBacklog(flag);
}

function runTokenDriftDetection(diff: string): void {
  if (!diff.includes(GLOBALS_PATH)) {
    log("no globals.css changes in diff — skipping token drift detection");
    return;
  }

  const flags = detectTokenDriftFromGlobalsCssDiff(diff);
  if (flags.length === 0) {
    log("no hardcoded CSS values detected in globals.css diff");
    return;
  }

  log(`detected ${flags.length} hardcoded value(s) in ${GLOBALS_PATH}`);
  for (const flag of flags) {
    flagTokenDrift(flag);
  }
}

function runTokenDriftOnlyMode(): void {
  const diffFile = getArg("--diff-file");
  if (!diffFile) {
    console.error("[ds-sync] --token-drift-only requires --diff-file <path>");
    process.exit(1);
  }

  const diff = readProjectFile(diffFile);
  runTokenDriftDetection(diff);
  stageModifiedFiles();
  log("token drift detection complete");
  process.exit(0);
}

function addColorToken(action: Extract<DsSyncAction, { type: "update_story"; target: "colors" }>): void {
  const path = COLORS_STORY;
  let content = readProjectFile(path);
  const name = action.name?.startsWith("--") ? action.name : `--${action.name ?? ""}`;
  if (!name || name === "--") {
    throw new Error("update_story colors requires name");
  }
  if (content.includes(`name: "${name}"`) || content.includes(`name: '${name}'`)) {
    log(`colors story already documents ${name}`);
    return;
  }

  const usage = action.usage ?? "Design token";
  const sample = action.sample ?? inferColorSample(name);
  const entry = `  { name: "${name}", usage: "${usage}", sample: "${sample}" },\n`;
  content = content.replace(
    /(const COLOR_TOKENS:[\s\S]*?=\s*\[\n)([\s\S]*?)(\n\];)/,
    `$1$2${entry}$3`,
  );
  writeProjectFile(path, content);
  log(`added color swatch for ${name}`);
}

function addTypographyClass(
  action: Extract<DsSyncAction, { type: "update_story"; target: "typography" }>,
): void {
  const path = TYPOGRAPHY_STORY;
  let content = readProjectFile(path);
  const className = action.className?.replace(/^\./, "") ?? "";
  if (!className) {
    throw new Error("update_story typography requires className");
  }
  if (content.includes(`className: "${className}"`) || content.includes(`className: '${className}'`)) {
    log(`typography story already documents .${className}`);
    return;
  }

  const sample = action.sample ?? "Sample text";
  const context = action.context ?? "Typography utility class";
  const entry = `  { className: "${className}", sample: "${sample}", context: "${context}" },\n`;
  content = content.replace(
    /(const TEXT_CLASSES:[\s\S]*?=\s*\[\n)([\s\S]*?)(\n\];)/,
    `$1$2${entry}$3`,
  );
  writeProjectFile(path, content);
  log(`added typography example for .${className}`);
}

function addSpacingToken(action: Extract<DsSyncAction, { type: "update_story"; target: "spacing" }>): void {
  const path = SPACING_STORY;
  let content = readProjectFile(path);
  const name = action.name?.startsWith("--") ? action.name : `--${action.name ?? ""}`;
  if (!name || name === "--") {
    throw new Error("update_story spacing requires name");
  }
  if (content.includes(`name: "${name}"`) || content.includes(`name: '${name}'`)) {
    log(`spacing story already documents ${name}`);
    return;
  }

  const usage = action.usage ?? "Spacing token";
  const entry = `  { name: "${name}", usage: "${usage}" },\n`;
  content = content.replace(
    /(const SPACING_TOKENS = \[\n)([\s\S]*?)(\n\] as const;)/,
    `$1$2${entry}$3`,
  );
  writeProjectFile(path, content);
  log(`added spacing token ${name}`);
}

function inferStoryCategory(componentPath: string, componentName: string): keyof typeof STORY_CATEGORY_PREFIX {
  const lowerPath = componentPath.toLowerCase();
  const lowerName = componentName.toLowerCase();

  if (lowerPath.includes("/ui/") || /badge|pill|button|filter/.test(lowerName)) {
    return "controls";
  }
  if (/sidebar|topbar|nav/.test(lowerName)) {
    return "navigation";
  }
  if (/appshell|page$|layout/.test(lowerName)) {
    return "layouts";
  }
  if (/table|grid|section|item|card|view|registry|report|content|panel|bar/.test(lowerName)) {
    return "data-display";
  }
  return "data-display";
}

function getComponentExportName(componentPath: string): string {
  const content = readProjectFile(componentPath);
  const named = content.match(/export\s+(?:function|const)\s+(\w+)/);
  if (named?.[1]) {
    return named[1];
  }
  const defaultExport = content.match(/export\s+default\s+(?:function\s+)?(\w+)/);
  if (defaultExport?.[1]) {
    return defaultExport[1];
  }
  return basename(componentPath, ".tsx");
}

function componentImportPath(componentPath: string): string {
  const withoutExt = componentPath.replace(/\.tsx$/, "");
  return `@/${withoutExt}`;
}

function createComponentStory(
  action: Extract<DsSyncAction, { type: "update_story"; target: "component" }>,
): void {
  const componentPath = action.componentPath;
  if (!componentPath) {
    throw new Error("update_story component requires componentPath");
  }
  if (!existsSync(join(ROOT, componentPath))) {
    throw new Error(`component not found: ${componentPath}`);
  }

  const componentName = getComponentExportName(componentPath);
  const category = action.storyCategory ?? inferStoryCategory(componentPath, componentName);
  const storyDir = join("stories", category);
  const storyPath = join(storyDir, `${componentName}.stories.tsx`);

  if (existsSync(join(ROOT, storyPath))) {
    log(`story already exists: ${storyPath}`);
    return;
  }

  const titlePrefix = STORY_CATEGORY_PREFIX[category];
  const importPath = componentImportPath(componentPath);
  const content = `import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ${componentName} } from "${importPath}";

const meta = {
  title: "${titlePrefix}/${componentName}",
  component: ${componentName},
  parameters: {
    layout: "padded",
  },
  decorators: [
    (Story) => (
      <div style={{ padding: "var(--spacing-card-padding)", background: "var(--color-bg-primary)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ${componentName}>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
`;

  writeProjectFile(storyPath, content);
  log(`created component story ${storyPath}`);
}

function tokenAliases(token: string): string[] {
  const normalized = token.startsWith("--") ? token : `--${token}`;
  const aliases = new Set<string>([normalized]);
  if (normalized.startsWith("--color-")) {
    aliases.add(normalized.replace(/^--color-/, "--"));
  } else if (normalized.startsWith("--") && !normalized.startsWith("--color-")) {
    aliases.add(`--color-${normalized.slice(2)}`);
  }
  return Array.from(aliases);
}

function updateDesignMd(action: Extract<DsSyncAction, { type: "update_design_md" }>): void {
  let content = readProjectFile(DESIGN_PATH);
  const token = action.token.startsWith("--") ? action.token : `--${action.token}`;
  const value = action.value;
  const aliases = tokenAliases(token);
  let updated = false;

  for (const alias of aliases) {
    const rowPattern = new RegExp(
      `(\\|\\s*\`${escapeRegExp(alias)}\`\\s*\\|\\s*)\`[^|\`]+\`(\\s*\\|[^\\n]*\\|)`,
    );
    if (rowPattern.test(content)) {
      content = content.replace(rowPattern, `$1\`${value}\`$2`);
      updated = true;
      break;
    }
  }

  if (!updated && action.section) {
    const sectionHeader = `### ${action.section}`;
    const sectionIndex = content.indexOf(sectionHeader);
    if (sectionIndex !== -1) {
      const tableStart = content.indexOf("| Token |", sectionIndex);
      const nextSection = content.indexOf("\n### ", sectionIndex + sectionHeader.length);
      const tableEnd = content.indexOf("\n\n", tableStart);
      const end = nextSection === -1 ? tableEnd : Math.min(nextSection, tableEnd);
      if (tableStart !== -1 && end !== -1) {
        const usage = action.usage ?? "Design token";
        const row = `| \`${token}\` | \`${value}\` | ${usage} |\n`;
        content = `${content.slice(0, end)}\n${row}${content.slice(end)}`;
        updated = true;
      }
    }
  }

  if (!updated) {
    log(`could not locate token row for ${token} in DESIGN.md`);
    return;
  }

  writeProjectFile(DESIGN_PATH, content);
  log(`updated DESIGN.md token ${token} → ${value}`);
}

function updateGlobalsCss(action: Extract<DsSyncAction, { type: "update_globals_css" }>): void {
  let content = readProjectFile(GLOBALS_PATH);
  const token = action.token.startsWith("--") ? action.token : `--${action.token}`;
  const value = action.value;
  const declaration = `    ${token}: ${value};`;

  const existing = new RegExp(`^\\s*${escapeRegExp(token)}:\\s*[^;]+;`, "m");
  if (existing.test(content)) {
    content = content.replace(existing, declaration);
  } else {
    content = content.replace(/(:root\s*\{)([\s\S]*?)(\n\s*\})/, `$1$2\n${declaration}$3`);
  }

  writeProjectFile(GLOBALS_PATH, content);
  log(`updated globals.css ${token} → ${value}`);
}

function executeAction(action: DsSyncAction): void {
  if (DRY_RUN) {
    log(`[dry-run] would execute: ${JSON.stringify(action)}`);
    if (action.type === "run_a11y_test") {
      return;
    }
  }

  switch (action.type) {
    case "update_story":
      switch (action.target) {
        case "colors":
          addColorToken(action);
          break;
        case "typography":
          addTypographyClass(action);
          break;
        case "spacing":
          addSpacingToken(action);
          break;
        case "component":
          createComponentStory(action);
          break;
        default:
          log(`unknown update_story target: ${(action as { target?: string }).target}`);
      }
      break;
    case "update_design_md":
      updateDesignMd(action);
      break;
    case "update_globals_css":
      updateGlobalsCss(action);
      break;
    case "run_a11y_test":
      log(
        action.storyPath
          ? `a11y coverage for ${action.storyPath} will run via test-storybook`
          : "a11y tests will run via test-storybook",
      );
      break;
    case "flag_orphan_component":
      flagOrphanComponent(action);
      break;
    default:
      log(`unknown action type: ${(action as { type?: string }).type}`);
  }
}

function runTestStorybook(): boolean {
  if (DRY_RUN) {
    log("[dry-run] would run: npm run test-storybook");
    return true;
  }

  log("running npm run test-storybook");
  const npmArgs = ["run", "test-storybook"];
  const storybookUrl = getArg("--storybook-url");
  if (storybookUrl) {
    npmArgs.push("--", "--url", storybookUrl);
  }

  const result = spawnSync("npm", npmArgs, {
    cwd: ROOT,
    encoding: "utf8",
    shell: process.platform === "win32",
    maxBuffer: 20 * 1024 * 1024,
  });

  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (output.trim()) {
    process.stdout.write(output);
    if (!output.endsWith("\n")) {
      process.stdout.write("\n");
    }
  }

  if ((result.status ?? 1) === 0) {
    return true;
  }

  const failures = parseA11yFailuresFromTestOutput(output);
  printA11yRegressionReport(failures);
  if (failures.length === 0) {
    console.error("[ds-sync] test-storybook failed — commit blocked (unparsed output)");
  }
  return false;
}

function stageModifiedFiles(): void {
  if (DRY_RUN || modifiedFiles.size === 0) {
    return;
  }
  const files = Array.from(modifiedFiles);
  log(`staging ${files.length} modified file(s)`);
  spawnSync("git", ["add", ...files], { cwd: ROOT, stdio: "inherit" });
}

async function main(): Promise<void> {
  const simulateDiff = Boolean(getArg("--diff-file"));
  const stagedFiles = getStagedFiles();
  const relevantFiles = stagedFiles.filter(isDesignRelevant);
  const orphanRelevantFiles = stagedFiles.filter(isOrphanDetectionRelevant);

  const globalsCssStaged = stagedFiles.includes(GLOBALS_PATH);

  if (relevantFiles.length === 0 && orphanRelevantFiles.length === 0 && !globalsCssStaged) {
    log("no design-relevant staged changes — skipping");
    process.exit(0);
  }

  if (relevantFiles.length > 0) {
    log(`design-relevant staged files (${relevantFiles.length}):`);
    for (const file of relevantFiles) {
      log(`  - ${file}`);
    }
  }

  const diff = getStagedDiff();
  if (!diff) {
    log("empty staged diff — skipping");
    process.exit(0);
  }

  if (orphanRelevantFiles.length > 0) {
    log(`orphan detection files (${orphanRelevantFiles.length}):`);
    for (const file of orphanRelevantFiles) {
      log(`  - ${file}`);
    }
    runOrphanDetection(diff, stagedFiles);
  }

  if (globalsCssStaged) {
    runTokenDriftDetection(diff);
  }

  if (relevantFiles.length === 0) {
    log("no design-token/component staged changes for Claude sync — skipping API call");
    stageModifiedFiles();
    log("design system sync complete");
    process.exit(0);
  }

  if (simulateDiff && DRY_RUN) {
    log("[dry-run] skipping Claude API call (--diff-file simulation mode)");
    log("design system sync complete");
    process.exit(0);
  }

  const actions = await callClaude(diff, relevantFiles);

  if (actions.length === 0) {
    log("Claude returned no sync actions");
  } else {
    log(`executing ${actions.length} action(s)${DRY_RUN ? " (dry-run)" : ""}`);
    for (const action of actions) {
      executeAction(action);
    }
  }

  const testsPassed = runTestStorybook();
  if (!testsPassed) {
    process.exit(1);
  }

  stageModifiedFiles();
  log("design system sync complete");
  process.exit(0);
}

if (process.argv.includes("--a11y-only")) {
  runA11yOnlyMode();
} else if (process.argv.includes("--parse-a11y-output")) {
  runParseA11yFixtureMode();
} else if (process.argv.includes("--token-drift-only")) {
  runTokenDriftOnlyMode();
} else {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[ds-sync] ${message}`);
    process.exit(1);
  });
}
