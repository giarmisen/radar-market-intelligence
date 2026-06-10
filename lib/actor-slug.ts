/** URL slug from tracked actor display name (e.g. "Phrase (Memsource)" → "phrase-memsource"). */
export function actorNameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

export function actorProfileHref(name: string): string {
  return `/actors/${actorNameToSlug(name)}`;
}
