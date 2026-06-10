import { loadDomainConfig, resolveDomainSlug } from "./config-loader";
import { getDomainMeta, getPendingProposalsCount } from "./domain";
import { dedupeRowsBySourceUrl } from "./signal-dedupe";
import { getSupabase } from "./supabase";
import type { ActorRole, SignalCategory } from "./types";

export interface LivingDocumentSignal {
  id: string;
  title: string;
  summary: string;
  so_what: string | null;
  category: SignalCategory;
  relevance: number;
  event_date: string;
  lifecycle: string | null;
  source_url: string;
  actor_names: string[];
}

export interface UpcomingEvent {
  id: string;
  title: string;
  scheduled_date: string;
  so_what: string | null;
  category: SignalCategory;
}

export interface ActorCard {
  id: string;
  name: string;
  role: ActorRole;
  tier: number;
  geography: string[] | null;
  lastSignalDate: string | null;
  signals: LivingDocumentSignal[];
  hasCritical: boolean;
}

export interface TierSection {
  tier: number;
  label: string;
  actors: ActorCard[];
}

export interface LivingDocumentPageData {
  domainName: string;
  domainSlug: string;
  upcoming: UpcomingEvent[];
  tiers: TierSection[];
  stats: {
    actors: number;
    signals: number;
    upcoming: number;
  };
  pendingProposals: number;
}

const TIER_LABELS: Record<number, string> = {
  1: "Tier 1 — Focus",
  2: "Tier 2 — Peripheral",
};

function parseActorNames(signalActors: unknown): string[] {
  if (!Array.isArray(signalActors)) {
    return [];
  }

  return signalActors
    .map((row) => {
      if (!row || typeof row !== "object" || !("actor" in row)) {
        return null;
      }
      const actor = (row as { actor: unknown }).actor;
      if (!actor || typeof actor !== "object") {
        return null;
      }
      const name = (actor as Record<string, unknown>).name;
      return typeof name === "string" ? name : null;
    })
    .filter((name): name is string => Boolean(name));
}

export async function getLivingDocumentData(
  domainSlug?: string,
): Promise<LivingDocumentPageData> {
  const slug = resolveDomainSlug(domainSlug);
  const config = loadDomainConfig(slug);
  const domain = await getDomainMeta(slug);
  const domainId = domain.id;
  const supabase = getSupabase();

  const [upcomingRes, signalsRes, actorsRes] = await Promise.all([
    supabase
      .from("upcoming_events")
      .select("id, title, scheduled_date, so_what, category")
      .eq("domain_id", domainId)
      .order("scheduled_date", { ascending: true }),
    supabase
      .from("signals")
      .select(
        `
        id,
        title,
        summary,
        so_what,
        category,
        relevance,
        event_date,
        source_url,
        captured_at,
        lifecycle,
        signal_actors (
          actor:actors ( name )
        )
      `,
      )
      .eq("domain_id", domainId)
      .gte("relevance", 2)
      .order("event_date", { ascending: false }),
    supabase
      .from("actors")
      .select("id, name, role, tier, geography")
      .eq("domain_id", domainId)
      .in("tier", [1, 2])
      .order("tier")
      .order("name"),
  ]);

  if (upcomingRes.error) {
    throw new Error(`upcoming_events: ${upcomingRes.error.message}`);
  }
  if (signalsRes.error) {
    throw new Error(`signals: ${signalsRes.error.message}`);
  }
  if (actorsRes.error) {
    throw new Error(`actors: ${actorsRes.error.message}`);
  }

  const signals: LivingDocumentSignal[] = dedupeRowsBySourceUrl(
    (signalsRes.data ?? []).map((signal) => ({
      id: signal.id as string,
      title: signal.title as string,
      summary: signal.summary as string,
      so_what: signal.so_what as string | null,
      category: signal.category as SignalCategory,
      relevance: signal.relevance as number,
      event_date: signal.event_date as string,
      source_url: signal.source_url as string,
      captured_at: (signal.captured_at as string | null) ?? undefined,
      lifecycle: signal.lifecycle as string | null,
      actor_names: parseActorNames(signal.signal_actors),
    })),
  );
  const actors = actorsRes.data ?? [];

  const signalsByActor = new Map<string, LivingDocumentSignal[]>();
  for (const signal of signals) {
    for (const actorName of signal.actor_names ?? []) {
      const existing = signalsByActor.get(actorName) ?? [];
      if (!existing.some((item) => item.id === signal.id)) {
        existing.push(signal);
      }
      signalsByActor.set(actorName, existing);
    }
  }

  for (const [name, actorSignals] of Array.from(signalsByActor.entries())) {
    actorSignals.sort((a, b) => b.event_date.localeCompare(a.event_date));
    signalsByActor.set(name, actorSignals.slice(0, 3));
  }

  const actorCards: ActorCard[] = actors
    .map((actor) => {
      const actorSignals = signalsByActor.get(actor.name) ?? [];
      const lastSignalDate = actorSignals[0]?.event_date ?? null;
      return {
        id: actor.id,
        name: actor.name,
        role: actor.role as ActorRole,
        tier: actor.tier,
        geography: actor.geography,
        lastSignalDate,
        signals: actorSignals,
        hasCritical: actorSignals.some((signal) => signal.relevance === 3),
      };
    })
    .filter((actor) => actor.signals.length > 0);

  const tiers: TierSection[] = [1, 2]
    .map((tier) => ({
      tier,
      label: TIER_LABELS[tier] ?? `Tier ${tier}`,
      actors: actorCards
        .filter((actor) => actor.tier === tier)
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .filter((section) => section.actors.length > 0);

  return {
    domainName: config.name,
    domainSlug: slug,
    upcoming: (upcomingRes.data ?? []) as UpcomingEvent[],
    tiers,
    stats: {
      actors: actorCards.length,
      signals: signals.length,
      upcoming: upcomingRes.data?.length ?? 0,
    },
    pendingProposals: await getPendingProposalsCount(domainId),
  };
}
