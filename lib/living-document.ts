import { loadDomainConfig, resolveDomainSlug } from "./config-loader";
import { getDomainMeta, getPendingProposalsCount } from "./domain";
import { groupSignals, type GroupedSignalSource } from "./group-signals";
import { dedupeRowsBySourceUrl } from "./signal-dedupe";
import { getSupabase } from "./supabase";
import { unstable_noStore as noStore } from "next/cache";
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
  captured_at?: string | null;
  actor_names: string[];
  grouped_sources?: GroupedSignalSource[];
  source_count?: number;
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
  worthWatching: LivingDocumentSignal[];
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

/** Max signals shown per actor card on Market Pulse */
const MARKET_PULSE_SIGNALS_PER_ACTOR = 3;

/** Max orphan signals flagged worth_watching on Market Pulse */
const WORTH_WATCHING_LIMIT = 5;

const MARKET_PULSE_SIGNALS_QUERY = `
SELECT
  s.id, s.title, s.summary, s.so_what, s.category, s.relevance,
  s.event_date, s.source_url, s.captured_at, s.lifecycle
FROM signals s
WHERE s.domain_id = :domain_id
  AND s.relevance >= 2
ORDER BY s.event_date DESC
`.trim();

const MARKET_PULSE_ACTOR_LINKS_QUERY = `
SELECT sa.signal_id, sa.actor_id, a.name AS actor_name, a.domain_id AS actor_domain_id
FROM signal_actors sa
LEFT JOIN actors a ON a.id = sa.actor_id
WHERE sa.signal_id IN (:signal_ids)
`.trim();

function logMarketPulseDebug(params: {
  domainId: string;
  domainSlug: string;
  rawSignalRows: number;
  rawActorLinkRows: number;
  actorLinksWithName: number;
  actorLinksDomainMismatch: number;
  afterDedupe: number;
  withActors: number;
  withoutActors: number;
  tier12Actors: number;
  actorsWithSignals: number;
  actorCards: number;
  signalsPerActorCap: number;
  orphanSample: string[];
  actorSignalCounts: Array<{
    name: string;
    total: number;
    shown: number;
    beforeGroup?: number;
    merged?: number;
  }>;
  rwsActorId: string | null;
  rwsLinkRows: number;
  transPerfectRaw?: number;
}): void {
  console.log("[market-pulse] SQL — signals:");
  console.log(MARKET_PULSE_SIGNALS_QUERY.replace(":domain_id", params.domainId));
  console.log("[market-pulse] SQL — actor links (LEFT JOIN actors):");
  console.log(
    MARKET_PULSE_ACTOR_LINKS_QUERY.replace(
      ":signal_ids",
      params.rawSignalRows > 0 ? "<signal ids from first query>" : "[]",
    ),
  );
  console.log("[market-pulse] filters: NO date limit on signals");
  console.log(
    `[market-pulse] signals rows: ${params.rawSignalRows} | signal_actors rows: ${params.rawActorLinkRows} | links with actor name: ${params.actorLinksWithName} | domain mismatches: ${params.actorLinksDomainMismatch}`,
  );
  if (params.rwsActorId) {
    console.log(
      `[market-pulse] RWS actor_id=${params.rwsActorId} signal_actors rows: ${params.rwsLinkRows}`,
    );
  }
  console.log(
    `[market-pulse] after URL dedupe: ${params.afterDedupe} | with actor names: ${params.withActors} | orphans: ${params.withoutActors}`,
  );
  if (params.orphanSample.length > 0) {
    console.log(
      `[market-pulse] orphan signal sample (no resolved actor): ${params.orphanSample.join(" | ")}`,
    );
  }
  console.log(
    `[market-pulse] tier 1/2 actors in registry: ${params.tier12Actors} | actors with >=1 signal: ${params.actorsWithSignals} | cards rendered: ${params.actorCards}`,
  );
  console.log(
    `[market-pulse] cap per actor card: ${params.signalsPerActorCap} (slice after sort by event_date desc)`,
  );
  for (const row of params.actorSignalCounts) {
    const mergedNote =
      row.merged && row.merged > 0 ? ` (${row.merged} merged into N-sources cards)` : "";
    console.log(
      `[market-pulse] ${row.name}: ${row.beforeGroup ?? row.total} in bucket → ${row.total} after grouping${mergedNote} → ${row.shown} on card`,
    );
  }

  const transPerfect = params.actorSignalCounts.find((row) => row.name === "TransPerfect");
  if (transPerfect && params.transPerfectRaw !== undefined) {
    console.log(
      `[market-pulse] TransPerfect: ${params.transPerfectRaw} in query (relevance >= 2) → ${transPerfect.beforeGroup ?? transPerfect.total} in bucket → ${transPerfect.total} after grouping → ${transPerfect.shown} on card`,
    );
  }
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

async function loadUpcomingEvents(
  domainId: string,
): Promise<{ data: UpcomingEvent[]; error: Error | null }> {
  const supabase = getSupabase();
  const today = todayIsoDate();

  const { data, error } = await supabase
    .from("signals")
    .select("id, title, scheduled_date, so_what, category")
    .eq("domain_id", domainId)
    .not("scheduled_date", "is", null)
    .gte("scheduled_date", today)
    .order("scheduled_date", { ascending: true });

  if (error) {
    return { data: [], error: new Error(`upcoming_events: ${error.message}`) };
  }

  console.log(
    `[market-pulse] upcoming events query: signals WHERE domain_id=${domainId} AND scheduled_date IS NOT NULL AND scheduled_date >= ${today} (no captured_at filter) → ${data?.length ?? 0} rows`,
  );

  return { data: (data ?? []) as UpcomingEvent[], error: null };
}

async function loadWorthWatchingSignals(
  domainId: string,
): Promise<{ data: LivingDocumentSignal[]; error: Error | null }> {
  const supabase = getSupabase();

  const { data: rows, error } = await supabase
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
        lifecycle
      `,
    )
    .eq("domain_id", domainId)
    .eq("worth_watching", true)
    .gt("relevance", 0)
    .order("event_date", { ascending: false })
    .limit(30);

  if (error) {
    return {
      data: [],
      error: new Error(`worth_watching: ${error.message}`),
    };
  }

  const signalIds = (rows ?? []).map((signal) => signal.id as string);
  if (signalIds.length === 0) {
    return { data: [], error: null };
  }

  const { data: links, error: linksError } = await supabase
    .from("signal_actors")
    .select("signal_id")
    .in("signal_id", signalIds);

  if (linksError) {
    return {
      data: [],
      error: new Error(`worth_watching signal_actors: ${linksError.message}`),
    };
  }

  const linkedSignalIds = new Set(
    (links ?? []).map((link) => link.signal_id as string),
  );

  const orphanSignals = dedupeRowsBySourceUrl(
    (rows ?? [])
      .filter((signal) => !linkedSignalIds.has(signal.id as string))
      .map((signal) => ({
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
        actor_names: [],
      })),
  );

  const groupedOrphans = groupSignals(orphanSignals).slice(
    0,
    WORTH_WATCHING_LIMIT,
  );

  console.log(
    `[market-pulse] worth_watching: ${rows?.length ?? 0} flagged, ${groupedOrphans.length} untracked shown`,
  );

  return { data: groupedOrphans, error: null };
}

function buildActorNamesBySignalId(
  links: Array<{ signal_id: string; actor_id: string }>,
  actorById: Map<string, { name: string; domain_id: string }>,
  signalDomainId: string,
): {
  bySignalId: Map<string, string[]>;
  linksWithName: number;
  domainMismatches: number;
} {
  const bySignalId = new Map<string, string[]>();
  let linksWithName = 0;
  let domainMismatches = 0;

  for (const link of links) {
    const actor = actorById.get(link.actor_id);
    if (!actor) {
      continue;
    }
    if (actor.domain_id !== signalDomainId) {
      domainMismatches += 1;
      continue;
    }
    linksWithName += 1;
    const names = bySignalId.get(link.signal_id) ?? [];
    if (!names.includes(actor.name)) {
      names.push(actor.name);
    }
    bySignalId.set(link.signal_id, names);
  }

  return { bySignalId, linksWithName, domainMismatches };
}

export async function getLivingDocumentData(
  domainSlug?: string,
): Promise<LivingDocumentPageData> {
  noStore();
  const slug = resolveDomainSlug(domainSlug);
  const config = loadDomainConfig(slug);
  const domain = await getDomainMeta(slug);
  const domainId = domain.id;
  const supabase = getSupabase();

  const [upcomingResult, worthWatchingResult, signalsRes, actorsRes, domainActorsRes] =
    await Promise.all([
    loadUpcomingEvents(domainId),
    loadWorthWatchingSignals(domainId),
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
        lifecycle
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
    supabase.from("actors").select("id, name, domain_id").eq("domain_id", domainId),
  ]);

  if (upcomingResult.error) {
    throw upcomingResult.error;
  }
  if (worthWatchingResult.error) {
    throw worthWatchingResult.error;
  }
  const upcoming = upcomingResult.data;
  const worthWatching = worthWatchingResult.data;
  if (signalsRes.error) {
    throw new Error(`signals: ${signalsRes.error.message}`);
  }
  console.log(
    `[market-pulse] Supabase signals (relevance >= 2): ${signalsRes.data?.length ?? 0} rows`,
  );
  if (actorsRes.error) {
    throw new Error(`actors: ${actorsRes.error.message}`);
  }
  if (domainActorsRes.error) {
    throw new Error(`actors (domain map): ${domainActorsRes.error.message}`);
  }

  const signalIds = (signalsRes.data ?? []).map((signal) => signal.id as string);
  let actorLinkRows: Array<{ signal_id: string; actor_id: string }> = [];

  if (signalIds.length > 0) {
    const linksRes = await supabase
      .from("signal_actors")
      .select("signal_id, actor_id")
      .in("signal_id", signalIds);

    if (linksRes.error) {
      throw new Error(`signal_actors: ${linksRes.error.message}`);
    }

    actorLinkRows = (linksRes.data ?? []) as Array<{
      signal_id: string;
      actor_id: string;
    }>;
  }

  const actorById = new Map(
    (domainActorsRes.data ?? []).map((actor) => [
      actor.id as string,
      { name: actor.name as string, domain_id: actor.domain_id as string },
    ]),
  );

  const { bySignalId, linksWithName, domainMismatches } = buildActorNamesBySignalId(
    actorLinkRows,
    actorById,
    domainId,
  );

  const rwsActor = (domainActorsRes.data ?? []).find(
    (actor) => actor.name === "RWS",
  );
  const rwsLinkRows = rwsActor
    ? actorLinkRows.filter((link) => link.actor_id === rwsActor.id).length
    : 0;

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
      actor_names: bySignalId.get(signal.id as string) ?? [],
    })),
  );
  console.log(
    `[market-pulse] after URL dedupe: ${signals.length} signals (${signalsRes.data?.length ?? 0} from Supabase)`,
  );
  const actors = actorsRes.data ?? [];

  const signalsByActor = new Map<string, LivingDocumentSignal[]>();
  const actorSignalCounts: Array<{
    name: string;
    total: number;
    shown: number;
    beforeGroup?: number;
    merged?: number;
  }> = [];

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
    const beforeGroup = actorSignals.length;
    console.log(
      `[market-pulse] grouping actor=${name}: ${beforeGroup} signals before groupSignals`,
    );
    const grouped = groupSignals(actorSignals, { scopeActor: name });
    grouped.sort((a, b) => b.event_date.localeCompare(a.event_date));
    const total = grouped.length;
    const shown = Math.min(total, MARKET_PULSE_SIGNALS_PER_ACTOR);
    signalsByActor.set(name, grouped.slice(0, MARKET_PULSE_SIGNALS_PER_ACTOR));
    actorSignalCounts.push({
      name,
      total,
      shown,
      beforeGroup,
      merged: beforeGroup - total,
    });
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

  const orphanSignals = signals.filter((signal) => signal.actor_names.length === 0);
  const linkedSignals = signals.length - orphanSignals.length;

  for (const tracked of ["TransPerfect", "RWS"]) {
    const row = actorSignalCounts.find((entry) => entry.name === tracked);
    if (!row) {
      actorSignalCounts.unshift({
        name: tracked,
        total: 0,
        shown: 0,
        beforeGroup: 0,
        merged: 0,
      });
    }
  }

  const transPerfectRaw = signals.filter((signal) =>
    signal.actor_names.includes("TransPerfect"),
  ).length;

  logMarketPulseDebug({
    domainId,
    domainSlug: slug,
    rawSignalRows: signalsRes.data?.length ?? 0,
    rawActorLinkRows: actorLinkRows.length,
    actorLinksWithName: linksWithName,
    actorLinksDomainMismatch: domainMismatches,
    afterDedupe: signals.length,
    withActors: linkedSignals,
    withoutActors: orphanSignals.length,
    tier12Actors: actors.length,
    actorsWithSignals: actorSignalCounts.length,
    actorCards: actorCards.length,
    signalsPerActorCap: MARKET_PULSE_SIGNALS_PER_ACTOR,
    orphanSample: orphanSignals.slice(0, 5).map((s) => s.title),
    actorSignalCounts,
    rwsActorId: (rwsActor?.id as string | undefined) ?? null,
    rwsLinkRows,
    transPerfectRaw,
  });

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
    upcoming,
    tiers,
    worthWatching,
    stats: {
      actors: actorCards.length,
      signals: actorCards.reduce((total, actor) => total + actor.signals.length, 0),
      upcoming: upcoming.length,
    },
    pendingProposals: await getPendingProposalsCount(domainId),
  };
}
