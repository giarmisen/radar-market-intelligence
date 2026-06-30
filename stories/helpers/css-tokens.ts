/** Reads a CSS custom property from :root via getComputedStyle. */
export function getCssVar(name: string): string {
  if (typeof document === "undefined") {
    return "";
  }
  const normalized = name.startsWith("--") ? name : `--${name}`;
  return getComputedStyle(document.documentElement).getPropertyValue(normalized).trim();
}

/** Converts a CSS color value to a hex string when possible. */
export function colorToHex(value: string): string {
  if (!value || value.startsWith("#")) {
    return value;
  }
  if (typeof document === "undefined") {
    return value;
  }
  const probe = document.createElement("span");
  probe.style.color = value;
  document.body.appendChild(probe);
  const rgb = getComputedStyle(probe).color;
  document.body.removeChild(probe);
  const match = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) {
    return value;
  }
  const hex = [match[1], match[2], match[3]]
    .map((channel) => Number(channel).toString(16).padStart(2, "0"))
    .join("");
  return `#${hex.toUpperCase()}`;
}

/** Formats a design token name with its live resolved value. */
export function formatTokenLabel(tokenName: string, resolvedValue: string): string {
  const normalized = tokenName.startsWith("--") ? tokenName : `--${tokenName}`;
  if (!resolvedValue || resolvedValue === "—") {
    return normalized;
  }
  return `${normalized} → ${resolvedValue}`;
}

/** Extracts duration in milliseconds from a transition shorthand (e.g. "all 0.15s"). */
export function parseSecondsToMs(value: string): string | null {
  const match = value.match(/([\d.]+)s\b/);
  if (!match?.[1]) {
    return null;
  }
  return `${Math.round(Number(match[1]) * 1000)}ms`;
}

/** Pulls a var(--token) reference from a CSS declaration value. */
export function extractCssVarName(value: string): string | null {
  const match = value.match(/var\((--[^,)]+)(?:,[^)]+)?\)/);
  return match?.[1] ?? null;
}

/** Reads a declared property from a single utility class rule in loaded stylesheets. */
export function getClassStyleProperty(className: string, property: string): string {
  if (typeof document === "undefined" || !className) {
    return "";
  }

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        if (!(rule instanceof CSSStyleRule)) {
          continue;
        }
        const selectors = rule.selectorText.split(",").map((selector) => selector.trim());
        if (!selectors.includes(`.${className}`)) {
          continue;
        }
        return rule.style.getPropertyValue(property).trim();
      }
    } catch {
      // Ignore inaccessible stylesheets.
    }
  }

  return "";
}

export interface TypographyMetricLine {
  label: string;
  value: string;
}

/** Builds token-traceable metric lines for a typography utility class. */
export function getTypographyMetricLines(
  classNames: string,
  computed: { fontSize: string; fontWeight: string; color: string },
): TypographyMetricLine[] {
  const lines: TypographyMetricLine[] = [];
  const classes = classNames.split(/\s+/).filter(Boolean);

  let fontSizeDecl = "";
  let fontWeightDecl = "";
  let colorDecl = "";

  for (const className of classes) {
    const nextFontSize = getClassStyleProperty(className, "font-size");
    const nextFontWeight = getClassStyleProperty(className, "font-weight");
    const nextColor = getClassStyleProperty(className, "color");
    if (nextFontSize) {
      fontSizeDecl = nextFontSize;
    }
    if (nextFontWeight) {
      fontWeightDecl = nextFontWeight;
    }
    if (nextColor) {
      colorDecl = nextColor;
    }
  }

  const fontSizeToken = extractCssVarName(fontSizeDecl);
  lines.push({
    label: "font-size",
    value: fontSizeToken
      ? formatTokenLabel(fontSizeToken, computed.fontSize)
      : `${fontSizeDecl || computed.fontSize} (class literal)`,
  });

  const fontWeightToken = extractCssVarName(fontWeightDecl);
  lines.push({
    label: "font-weight",
    value: fontWeightToken
      ? formatTokenLabel(fontWeightToken, computed.fontWeight)
      : `${fontWeightDecl || computed.fontWeight} (class literal)`,
  });

  const colorToken = extractCssVarName(colorDecl);
  const resolvedColor = colorToHex(computed.color) || computed.color;
  lines.push({
    label: "color",
    value: colorToken
      ? formatTokenLabel(colorToken, resolvedColor)
      : `${colorDecl || computed.color} (no named token)`,
  });

  return lines;
}
