import { loadDomainConfig, resolveDomainSlug } from "./config-loader";
import { getDomainMeta, getPendingProposalsCount } from "./domain";
import { groupSignals, type GroupedSignalSource } from "./group-signals";
import { dedupeRowsBySourceUrl } from "./signal-dedupe";
import { getSupabase } from "./supabase";
import type { ActorRole, SignalCategory } from "./types";

export interface TimelineActor {
  id: string;
  name: string;
  tier: number;
  role: ActorRole;
}

export interface TimelineRow {
  id: string;
  event_date: string;
  category: SignalCategory;
  relevance: number;
  summary: string;
  so_what: string | null;
  source_url: string;
  lifecycle: string | null;
  captured_at?: string | null;
  actors: TimelineActor[];
  top_tier: number;
  grouped_sources?: GroupedSignalSource[];
  source_count?: number;
}

export interface TimelinePageData {
  domainName: string;
  domainSlug: string;
  rows: TimelineRow[];
  pendingProposals: number;
  stats: {
    total: number;
    actors: number;
    categories: number;
  };
}

function parseTimelineActors(
  signalActors: unknown,
): TimelineActor[] {
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
      const a = actor as Record<string, unknown>;
      if (
        typeof a.id !== "string" ||
        typeof a.name !== "string" ||
        typeof a.tier !== "number" ||
        typeof a.role !== "string"
      ) {
        return null;
      }
      return {
        id: a.id,
        name: a.name,
        tier: a.tier,
        role: a.role as ActorRole,
      };
    })
    .filter((actor): actor is TimelineActor => Boolean(actor));
}

export async function getTimelineData(
  domainSlug?: string,
): Promise<TimelinePageData> {
  const slug = resolveDomainSlug(domainSlug);
  const config = loadDomainConfig(slug);
  const domain = await getDomainMeta(slug);
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("signals")
    .select(
      `
      id,
      event_date,
      category,
      relevance,
      summary,
      so_what,
      source_url,
      captured_at,
      lifecycle,
      signal_actors (
        actor:actors ( id, name, tier, role )
      )
    `,
    )
    .eq("domain_id", domain.id)
    .gte("relevance", 1)
    .order("event_date", { ascending: false });

  if (error) {
    throw new Error(`signals: ${error.message}`);
  }

  const dedupedRows = dedupeRowsBySourceUrl(
    (data ?? []).map((signal) => {
      const actors = parseTimelineActors(signal.signal_actors);

      return {
        id: signal.id as string,
        event_date: signal.event_date as string,
        category: signal.category as SignalCategory,
        relevance: signal.relevance as number,
        summary: signal.summary as string,
        so_what: signal.so_what as string | null,
        source_url: signal.source_url as string,
        captured_at: (signal.captured_at as string | null) ?? undefined,
        lifecycle: signal.lifecycle as string | null,
        actors,
        top_tier:
          actors.length > 0
            ? Math.min(...actors.map((actor) => actor.tier))
            : 99,
        actor_names: actors.map((actor) => actor.name),
      };
    }),
  );

  const rows: TimelineRow[] = groupSignals(
    dedupedRows.map((row) => ({
      id: row.id,
      category: row.category,
      event_date: row.event_date,
      relevance: row.relevance,
      summary: row.summary,
      source_url: row.source_url,
      captured_at: row.captured_at,
      actor_names: row.actor_names,
    })),
  ).map((grouped) => {
    const source = dedupedRows.find((row) => row.id === grouped.id);
    if (!source) {
      throw new Error(`Missing timeline row for grouped signal ${grouped.id}`);
    }

    return {
      id: grouped.id,
      event_date: grouped.event_date,
      category: grouped.category,
      relevance: grouped.relevance,
      summary: grouped.summary,
      so_what: source.so_what,
      source_url: grouped.source_url,
      captured_at: grouped.captured_at,
      lifecycle: source.lifecycle,
      actors: source.actors,
      top_tier: source.top_tier,
      grouped_sources: grouped.grouped_sources,
      source_count: grouped.source_count,
    };
  });

  const actorNames = new Set<string>();
  const categories = new Set<string>();
  for (const row of rows) {
    categories.add(row.category);
    for (const actor of row.actors) {
      actorNames.add(actor.name);
    }
  }

  return {
    domainName: config.name,
    domainSlug: slug,
    rows,
    pendingProposals: await getPendingProposalsCount(domain.id),
    stats: {
      total: rows.length,
      actors: actorNames.size,
      categories: categories.size,
    },
  };
}
