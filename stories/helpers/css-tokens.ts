/** Reads a CSS custom property from :root via getComputedStyle. */
export function getCssVar(name: string): string {
  if (typeof document === "undefined") {
    return "";
  }
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
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
