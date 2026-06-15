import type { DomainConfig, SeedCounts, SeedResult } from "./types";
import { getSupabase } from "./supabase";

function emptyCounts(): SeedCounts {
  return { inserted: 0, updated: 0, skipped: 0 };
}

function scheduledEventFingerprint(
  domainSlug: string,
  title: string,
  scheduledDate: string,
): string {
  return `seed:scheduled:${domainSlug}:${scheduledDate}:${title}`;
}

async function upsertDomain(config: DomainConfig): Promise<string> {
  const supabase = getSupabase();

  const { data: existing, error: selectError } = await supabase
    .from("domains")
    .select("id")
    .eq("slug", config.slug)
    .maybeSingle();

  if (selectError) {
    throw new Error(`Failed to load domain: ${selectError.message}`);
  }

  if (existing) {
    const { error: updateError } = await supabase
      .from("domains")
      .update({
        name: config.name,
        funding_significance: config.funding_significance_usd,
      })
      .eq("id", existing.id);

    if (updateError) {
      throw new Error(`Failed to update domain: ${updateError.message}`);
    }

    return existing.id;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("domains")
    .insert({
      slug: config.slug,
      name: config.name,
      funding_significance: config.funding_significance_usd,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    throw new Error(`Failed to insert domain: ${insertError?.message}`);
  }

  return inserted.id;
}

async function seedActors(
  domainId: string,
  config: DomainConfig,
): Promise<SeedCounts> {
  const supabase = getSupabase();
  const counts = emptyCounts();

  for (const actor of config.actors) {
    const { data: existing, error: selectError } = await supabase
      .from("actors")
      .select("id")
      .eq("domain_id", domainId)
      .eq("name", actor.name)
      .maybeSingle();

    if (selectError) {
      throw new Error(`Failed to load actor ${actor.name}: ${selectError.message}`);
    }

    const row = {
      domain_id: domainId,
      name: actor.name,
      role: actor.role,
      tier: actor.tier,
      geography: actor.geography ?? null,
      status: "active" as const,
    };

    if (existing) {
      const { error: updateError } = await supabase
        .from("actors")
        .update({
          role: row.role,
          tier: row.tier,
          geography: row.geography,
        })
        .eq("id", existing.id);

      if (updateError) {
        throw new Error(`Failed to update actor ${actor.name}: ${updateError.message}`);
      }

      counts.updated += 1;
      continue;
    }

    const { error: insertError } = await supabase.from("actors").insert(row);

    if (insertError) {
      throw new Error(`Failed to insert actor ${actor.name}: ${insertError.message}`);
    }

    counts.inserted += 1;
  }

  return counts;
}

async function seedRadarQueries(
  domainId: string,
  config: DomainConfig,
): Promise<SeedCounts> {
  const supabase = getSupabase();
  const counts = emptyCounts();

  for (const query of config.radar_queries) {
    const { data: existing, error: selectError } = await supabase
      .from("radar_queries")
      .select("id")
      .eq("domain_id", domainId)
      .eq("label", query.label)
      .maybeSingle();

    if (selectError) {
      throw new Error(
        `Failed to load radar query ${query.label}: ${selectError.message}`,
      );
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from("radar_queries")
        .update({ query: query.query, active: true })
        .eq("id", existing.id);

      if (updateError) {
        throw new Error(
          `Failed to update radar query ${query.label}: ${updateError.message}`,
        );
      }

      counts.updated += 1;
      continue;
    }

    const { error: insertError } = await supabase.from("radar_queries").insert({
      domain_id: domainId,
      label: query.label,
      query: query.query,
      active: true,
    });

    if (insertError) {
      throw new Error(
        `Failed to insert radar query ${query.label}: ${insertError.message}`,
      );
    }

    counts.inserted += 1;
  }

  return counts;
}

async function upsertSource(
  domainId: string,
  label: string,
  type: DomainConfig["field_sources"][number]["type"],
  url: string | null,
): Promise<"inserted" | "updated"> {
  const supabase = getSupabase();

  const { data: existing, error: selectError } = await supabase
    .from("sources")
    .select("id")
    .eq("domain_id", domainId)
    .eq("label", label)
    .maybeSingle();

  if (selectError) {
    throw new Error(`Failed to load source ${label}: ${selectError.message}`);
  }

  const row = {
    domain_id: domainId,
    actor_id: null,
    type,
    url,
    label,
    status: "active" as const,
    is_tier0: false,
  };

  if (existing) {
    const { error: updateError } = await supabase
      .from("sources")
      .update({ type: row.type, url: row.url, status: row.status })
      .eq("id", existing.id);

    if (updateError) {
      throw new Error(`Failed to update source ${label}: ${updateError.message}`);
    }

    return "updated";
  }

  const { error: insertError } = await supabase.from("sources").insert(row);

  if (insertError) {
    throw new Error(`Failed to insert source ${label}: ${insertError.message}`);
  }

  return "inserted";
}

async function seedSources(
  domainId: string,
  config: DomainConfig,
): Promise<SeedCounts> {
  const counts = emptyCounts();

  for (const source of config.field_sources) {
    const result = await upsertSource(
      domainId,
      source.label,
      source.type,
      source.url,
    );
    counts[result] += 1;
  }

  for (const search of config.saved_searches) {
    const result = await upsertSource(domainId, search, "search_query", null);
    counts[result] += 1;
  }

  return counts;
}

async function seedScheduledEvents(
  domainId: string,
  config: DomainConfig,
): Promise<SeedCounts> {
  const supabase = getSupabase();
  const counts = emptyCounts();

  for (const event of config.scheduled_events_seed) {
    const eventFingerprint = scheduledEventFingerprint(
      config.slug,
      event.title,
      event.scheduled_date,
    );

    const { data: existing, error: selectError } = await supabase
      .from("signals")
      .select("id")
      .eq("domain_id", domainId)
      .eq("event_fingerprint", eventFingerprint)
      .maybeSingle();

    if (selectError) {
      throw new Error(
        `Failed to load scheduled event ${event.title}: ${selectError.message}`,
      );
    }

    const row = {
      domain_id: domainId,
      event_date: event.scheduled_date,
      captured_at: null,
      category: event.category,
      relevance: 3,
      source_url: `radar://seed/scheduled-events/${event.scheduled_date}`,
      title: event.title,
      summary: event.title,
      so_what: event.so_what,
      scheduled_date: event.scheduled_date,
      event_fingerprint: eventFingerprint,
    };

    if (existing) {
      const { error: updateError } = await supabase
        .from("signals")
        .update({
          event_date: row.event_date,
          captured_at: row.captured_at,
          category: row.category,
          relevance: row.relevance,
          source_url: row.source_url,
          title: row.title,
          summary: row.summary,
          so_what: row.so_what,
          scheduled_date: row.scheduled_date,
        })
        .eq("id", existing.id);

      if (updateError) {
        throw new Error(
          `Failed to update scheduled event ${event.title}: ${updateError.message}`,
        );
      }

      counts.updated += 1;
      continue;
    }

    const { error: insertError } = await supabase.from("signals").insert(row);

    if (insertError) {
      throw new Error(
        `Failed to insert scheduled event ${event.title}: ${insertError.message}`,
      );
    }

    counts.inserted += 1;
  }

  return counts;
}

export async function seedDomain(config: DomainConfig): Promise<SeedResult> {
  const domainId = await upsertDomain(config);

  const [actors, radar_queries, sources, scheduled_events] = await Promise.all([
    seedActors(domainId, config),
    seedRadarQueries(domainId, config),
    seedSources(domainId, config),
    seedScheduledEvents(domainId, config),
  ]);

  return {
    domain_id: domainId,
    domain_slug: config.slug,
    actors,
    radar_queries,
    sources,
    scheduled_events,
  };
}
