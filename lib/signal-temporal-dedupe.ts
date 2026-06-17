import {
  maxRelevanceInTemporalWindow,
  temporalWindowStart,
} from "./group-signals";
import { getSupabase } from "./supabase";

export interface TemporalDedupeRecord {
  actorIds: string[];
  category: string;
  eventDate: string;
  relevance: number;
}

export async function maxExistingTemporalRelevance(params: {
  domainId: string;
  category: string;
  actorIds: string[];
  eventDate: string;
}): Promise<number> {
  const { domainId, category, actorIds, eventDate } = params;
  if (actorIds.length === 0) {
    return 0;
  }

  const supabase = getSupabase();
  const windowStart = temporalWindowStart(eventDate);

  const { data: links, error: linksError } = await supabase
    .from("signal_actors")
    .select("signal_id")
    .in("actor_id", actorIds);

  if (linksError) {
    throw new Error(`Temporal dedupe actor lookup failed: ${linksError.message}`);
  }

  const signalIds = Array.from(
    new Set((links ?? []).map((link) => link.signal_id as string)),
  );
  if (signalIds.length === 0) {
    return 0;
  }

  const { data: signals, error: signalsError } = await supabase
    .from("signals")
    .select("relevance")
    .eq("domain_id", domainId)
    .eq("category", category)
    .gte("event_date", windowStart)
    .lte("event_date", eventDate)
    .in("id", signalIds);

  if (signalsError) {
    throw new Error(`Temporal dedupe signal lookup failed: ${signalsError.message}`);
  }

  if (!signals?.length) {
    return 0;
  }

  return Math.max(...signals.map((signal) => signal.relevance as number));
}

export function shouldSkipTemporalDedupe(params: {
  relevance: number;
  category: string;
  actorIds: string[];
  eventDate: string;
  batchRecords: TemporalDedupeRecord[];
  existingMaxRelevance: number;
}): boolean {
  const { relevance, category, actorIds, eventDate, batchRecords, existingMaxRelevance } =
    params;

  if (actorIds.length === 0) {
    return false;
  }

  const batchMax = maxRelevanceInTemporalWindow(
    batchRecords,
    actorIds,
    category,
    eventDate,
  );
  const maxExisting = Math.max(existingMaxRelevance, batchMax);

  if (maxExisting === 0) {
    return false;
  }

  return relevance <= maxExisting;
}
