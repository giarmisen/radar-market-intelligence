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

export function categoryClassName(category: SignalCategory): string {
  return `radar-category-badge cat-${category}`;
}

export function formatRole(role: ActorRole): string {
  return ROLE_LABELS[role] ?? role;
}

export function formatDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatLifecycle(lifecycle: string): string {
  return lifecycle.replace(/_/g, " ");
}

export function formatActorStatus(status: string): string {
  const labels: Record<string, string> = {
    active: "Active",
    archived_shutdown: "Archived — shutdown",
    archived_acquired: "Archived — acquired",
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
