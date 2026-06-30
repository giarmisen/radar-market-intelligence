import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
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

const STORY_CATEGORY_PREFIX: Record<string, string> = {
  foundation: "1. Foundation",
  navigation: "2. Navigation",
  controls: "3. Controls",
  "data-display": "4. Data Display",
  layouts: "5. Layouts",
};

type StoryTarget = "colors" | "typography" | "spacing" | "component";

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
      target: StoryTarget;
      name?: string;
      className?: string;
      usage?: string;
      sample?: string;
      context?: string;
      componentPath?: string;
      storyCategory?: keyof typeof STORY_CATEGORY_PREFIX;
    }
  | {
      type: "run_a11y_test";
      storyPath?: string;
    };

const modifiedFiles = new Set<string>();

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

function isDesignRelevant(file: string): boolean {
  if (file === GLOBALS_PATH || file === DESIGN_PATH) {
    return true;
  }
  return /^components\/.*\.tsx$/.test(file);
}

function getStagedFiles(): string[] {
  const output = runGit(["diff", "--cached", "--name-only"]);
  if (!output) {
    return [];
  }
  return output.split("\n").filter(Boolean);
}

function getStagedDiff(): string {
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

Rules:
- New --color-* in globals.css → update_story colors (do not duplicate existing tokens)
- New .text-* class in globals.css → update_story typography
- New --spacing-* in globals.css → update_story spacing
- New component .tsx in components/ without a matching stories file → update_story component
- Modified token value in globals.css → update_design_md
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
  return [...aliases];
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
  const result = spawnSync("npm", ["run", "test-storybook"], {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  return (result.status ?? 1) === 0;
}

function stageModifiedFiles(): void {
  if (DRY_RUN || modifiedFiles.size === 0) {
    return;
  }
  const files = [...modifiedFiles];
  log(`staging ${files.length} modified file(s)`);
  spawnSync("git", ["add", ...files], { cwd: ROOT, stdio: "inherit" });
}

async function main(): Promise<void> {
  const stagedFiles = getStagedFiles();
  const relevantFiles = stagedFiles.filter(isDesignRelevant);

  if (relevantFiles.length === 0) {
    log("no design-relevant staged changes — skipping");
    process.exit(0);
  }

  log(`design-relevant staged files (${relevantFiles.length}):`);
  for (const file of relevantFiles) {
    log(`  - ${file}`);
  }

  const diff = getStagedDiff();
  if (!diff) {
    log("empty staged diff — skipping");
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
    console.error("[ds-sync] test-storybook failed — commit blocked");
    process.exit(1);
  }

  stageModifiedFiles();
  log("design system sync complete");
  process.exit(0);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[ds-sync] ${message}`);
  process.exit(1);
});
