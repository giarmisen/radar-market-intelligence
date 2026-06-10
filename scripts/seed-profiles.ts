import { config } from "dotenv";
import { resolve } from "path";
import { PROFILES, type ActorProfileSeed } from "./data/language-services-ai-profiles";
import { getSupabase } from "../lib/supabase";

config({ path: resolve(process.cwd(), ".env.local") });

const DEFAULT_DOMAIN_SLUG = "language-services-ai";

interface SeedProfilesSummary {
  domain: string;
  processed: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

async function getDomainId(slug: string): Promise<string> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("domains")
    .select("id")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    throw new Error(`Domain not found: ${slug}`);
  }

  return data.id;
}

async function loadActorIdMap(domainId: string): Promise<Map<string, string>> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("actors")
    .select("id, name")
    .eq("domain_id", domainId);

  if (error) {
    throw new Error(`Failed to load actors: ${error.message}`);
  }

  return new Map((data ?? []).map((actor) => [actor.name, actor.id]));
}

function hasProfileContent(profile: ActorProfileSeed): boolean {
  return Boolean(
    profile.description.trim() ||
      profile.business_model.trim() ||
      profile.ai_strategy.trim() ||
      profile.recent_moves.trim(),
  );
}

function profileRow(actorId: string, profile: ActorProfileSeed) {
  return {
    actor_id: actorId,
    description: profile.description.trim(),
    business_model: profile.business_model.trim(),
    ai_strategy: profile.ai_strategy.trim(),
    recent_moves: profile.recent_moves.trim(),
    revenue_usd: profile.revenue_usd,
    revenue_year: profile.revenue_year,
    headcount_approx: profile.headcount_approx,
    hq: profile.hq,
    core_products: profile.core_products,
    core_technology: profile.core_technology,
    key_markets: profile.key_markets,
    updated_at: new Date().toISOString(),
  };
}

async function upsertProfile(params: {
  actorId: string;
  profile: ActorProfileSeed;
}): Promise<"inserted" | "updated"> {
  const supabase = getSupabase();
  const { actorId, profile } = params;
  const row = profileRow(actorId, profile);

  const { data: existing, error: selectError } = await supabase
    .from("actor_profiles")
    .select("id")
    .eq("actor_id", actorId)
    .maybeSingle();

  if (selectError) {
    throw new Error(`Profile lookup failed: ${selectError.message}`);
  }

  if (existing) {
    const { error: updateError } = await supabase
      .from("actor_profiles")
      .update(row)
      .eq("id", existing.id);

    if (updateError) {
      throw new Error(`Profile update failed: ${updateError.message}`);
    }

    return "updated";
  }

  const { error: insertError } = await supabase.from("actor_profiles").insert(row);

  if (insertError) {
    throw new Error(`Profile insert failed: ${insertError.message}`);
  }

  return "inserted";
}

export async function seedActorProfiles(
  domainSlug: string = DEFAULT_DOMAIN_SLUG,
  profiles: ActorProfileSeed[] = PROFILES,
): Promise<SeedProfilesSummary> {
  const domainId = await getDomainId(domainSlug);
  const actorIds = await loadActorIdMap(domainId);

  let processed = 0;
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const profile of profiles) {
    processed += 1;

    if (!hasProfileContent(profile)) {
      skipped += 1;
      continue;
    }

    try {
      const actorId = actorIds.get(profile.actor_name);
      if (!actorId) {
        throw new Error(`Actor not found in domain: ${profile.actor_name}`);
      }

      const result = await upsertProfile({ actorId, profile });
      if (result === "inserted") {
        inserted += 1;
      } else {
        updated += 1;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown profile seed error";
      errors.push(`${profile.actor_name}: ${message}`);
    }
  }

  return {
    domain: domainSlug,
    processed,
    inserted,
    updated,
    skipped,
    errors,
  };
}

const domainSlug = process.argv[2] ?? DEFAULT_DOMAIN_SLUG;

seedActorProfiles(domainSlug)
  .then((summary) => {
    const rlsHint = summary.errors.some((error) =>
      error.includes("row-level security"),
    )
      ? "Run supabase/actor-profiles-access.sql in the Supabase SQL Editor, then retry."
      : undefined;

    console.log(
      JSON.stringify({ ok: summary.errors.length === 0, ...summary, hint: rlsHint }, null, 2),
    );
    if (summary.errors.length > 0) {
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
