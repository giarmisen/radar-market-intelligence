import type { ActorRole, SignalCategory } from "./types";

const CATEGORY_LABELS: Record<SignalCategory, string> = {
  team: "Team / M&A",
  commercial: "Commercial",
  geopolitical: "Geopolitical",
  regulatory: "Regulatory",
  product: "Product",
  communications: "Communications",
  technical: "Technical",
};

const ROLE_LABELS: Record<ActorRole, string> = {
  producer: "Producer",
  processor: "Processor",
  buyer: "Buyer",
  regulator: "Regulator",
  reference: "Reference",
};

export function formatCategory(category: SignalCategory): string {
  return CATEGORY_LABELS[category] ?? category;
}

export function formatRole(role: ActorRole): string {
  return ROLE_LABELS[role] ?? role;
}

const NEW_SIGNAL_WINDOW_MS = 24 * 60 * 60 * 1000;

/** True when ingested in the last 24 hours. Scheduled seeds have null captured_at. */
export function isNewSignal(capturedAt: string | null | undefined): boolean {
  if (!capturedAt) {
    return false;
  }

  const captured = new Date(capturedAt);
  if (Number.isNaN(captured.getTime())) {
    return false;
  }

  return Date.now() - captured.getTime() <= NEW_SIGNAL_WINDOW_MS;
}

export function formatDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const LIFECYCLE_LABELS: Record<string, string> = {
  shutdown: "shutdown",
  acquired: "acquisition",
  pivot: "pivot",
};

export function formatLifecycle(lifecycle: string): string {
  return LIFECYCLE_LABELS[lifecycle] ?? lifecycle.replace(/_/g, " ");
}

export function formatActorStatus(status: string): string {
  const labels: Record<string, string> = {
    active: "Active",
    archived_shutdown: "Archived (shutdown)",
    archived_acquired: "Archived (acquired)",
    candidate: "Candidate",
  };
  return labels[status] ?? status;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatRevenueUsd(value: number | null): string | null {
  if (value == null) {
    return null;
  }

  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2).replace(/\.00$/, "")}B`;
  }

  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(0)}M`;
  }

  return `$${value.toLocaleString("en-US")}`;
}

export function formatProposalType(type: string): string {
  const labels: Record<string, string> = {
    promote_actor: "Promote actor",
    demote_actor: "Demote actor",
    new_actor: "New actor",
    archive_actor: "Archive actor",
    new_tier0_source: "New Tier 0 source",
  };
  return labels[type] ?? type.replace(/_/g, " ");
}

export function formatProposalStatus(status: "approved" | "rejected"): string {
  return status === "approved" ? "Approved" : "Rejected";
}
