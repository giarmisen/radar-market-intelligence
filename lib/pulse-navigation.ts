import type { LivingDocumentPageData } from "./living-document";

export function collectPulseSignalIds(data: LivingDocumentPageData): Set<string> {
  const ids = new Set<string>();

  for (const signal of data.newToday) {
    ids.add(signal.id);
  }
  for (const signal of data.worthWatching) {
    ids.add(signal.id);
  }
  for (const tier of data.tiers) {
    for (const actor of tier.actors) {
      for (const signal of actor.signals) {
        ids.add(signal.id);
      }
    }
  }

  return ids;
}

export function scrollToSignal(signalId: string): void {
  const anchorId = `signal-${signalId}`;
  let target = document.getElementById(anchorId);

  if (!target || target.offsetParent === null) {
    const nodes = document.querySelectorAll<HTMLElement>(
      `[data-signal-id="${signalId}"]`,
    );
    target =
      [...nodes].find((node) => node.offsetParent !== null) ?? nodes[0] ?? null;
  }

  if (!target) {
    return;
  }

  target.scrollIntoView({ behavior: "smooth", block: "center" });
  target.classList.remove("radar-signal-highlight");
  void target.getBoundingClientRect();
  target.classList.add("radar-signal-highlight");
  window.setTimeout(() => {
    target.classList.remove("radar-signal-highlight");
  }, 1000);
}

export type UpcomingPillTarget =
  | { kind: "pulse"; href: string }
  | { kind: "timeline"; href: string }
  | { kind: "static" };

export function resolveUpcomingPillTarget(
  signalId: string,
  pulseSignalIds: Set<string>,
): UpcomingPillTarget {
  const href = `#signal-${signalId}`;

  if (pulseSignalIds.has(signalId)) {
    return { kind: "pulse", href };
  }

  if (signalId.startsWith("upcoming-")) {
    return { kind: "static" };
  }

  return { kind: "timeline", href: `/timeline${href}` };
}
