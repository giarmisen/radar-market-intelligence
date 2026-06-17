/** Display + ingest window: signals within this range may cover the same event. */
export const SIGNAL_GROUP_WINDOW_MS = 24 * 60 * 60 * 1000;

export const SIGNAL_GROUP_WINDOW_HOURS = 24;

export interface GroupedSignalSource {
  id: string;
  source_url: string;
  summary: string;
  relevance: number;
  event_date: string;
  captured_at?: string | null;
}

export interface GroupableSignal {
  id: string;
  category: string;
  event_date: string;
  relevance: number;
  summary: string;
  source_url: string;
  captured_at?: string | null;
  /** When omitted or empty, grouping uses category + date only (single-actor views). */
  actor_names?: string[];
}

export type WithGroupedSources<T> = T & {
  grouped_sources?: GroupedSignalSource[];
  source_count?: number;
};

function parseEventDateMs(eventDate: string): number {
  return new Date(`${eventDate}T12:00:00Z`).getTime();
}

export function datesWithinGroupWindow(a: string, b: string): boolean {
  return (
    Math.abs(parseEventDateMs(a) - parseEventDateMs(b)) <= SIGNAL_GROUP_WINDOW_MS
  );
}

/** @deprecated Use datesWithinGroupWindow */
export const datesWithinTemporalWindow = datesWithinGroupWindow;

export function temporalWindowStart(eventDate: string): string {
  const start = new Date(parseEventDateMs(eventDate) - SIGNAL_GROUP_WINDOW_MS);
  return start.toISOString().slice(0, 10);
}

function shareActor(a: string[] | undefined, b: string[] | undefined): boolean {
  const left = a?.filter(Boolean) ?? [];
  const right = b?.filter(Boolean) ?? [];
  if (left.length === 0 && right.length === 0) {
    return true;
  }
  if (left.length === 0 || right.length === 0) {
    return false;
  }
  return left.some((name) => right.includes(name));
}

function shouldClusterSignals(left: GroupableSignal, right: GroupableSignal): boolean {
  if (left.category !== right.category) {
    return false;
  }
  if (!datesWithinGroupWindow(left.event_date, right.event_date)) {
    return false;
  }
  return shareActor(left.actor_names, right.actor_names);
}

function stripGroupedMetadata<T extends GroupableSignal>(
  signal: WithGroupedSources<T>,
): T {
  const rest = { ...signal };
  delete rest.grouped_sources;
  delete rest.source_count;
  return rest as T;
}

/** Expand previously grouped rows so re-applying groupSignals never drops source ids. */
function flattenInputSignals<T extends GroupableSignal>(
  signals: WithGroupedSources<T>[],
): T[] {
  const flat: T[] = [];

  for (const signal of signals) {
    const sources = signal.grouped_sources;
    if (sources && sources.length > 1) {
      for (const source of sources) {
        flat.push({
          ...(signal as T),
          id: source.id,
          source_url: source.source_url,
          summary: source.summary,
          relevance: source.relevance,
          event_date: source.event_date,
          captured_at: source.captured_at,
          grouped_sources: undefined,
          source_count: undefined,
        });
      }
      continue;
    }

    flat.push(stripGroupedMetadata(signal));
  }

  return flat;
}

function clusterSignals<T extends GroupableSignal>(signals: T[]): T[][] {
  const parent = signals.map((_, index) => index);

  function find(index: number): number {
    if (parent[index] !== index) {
      parent[index] = find(parent[index]);
    }
    return parent[index];
  }

  function union(left: number, right: number): void {
    parent[find(left)] = find(right);
  }

  for (let i = 0; i < signals.length; i += 1) {
    for (let j = i + 1; j < signals.length; j += 1) {
      if (shouldClusterSignals(signals[i], signals[j])) {
        union(i, j);
      }
    }
  }

  const clusters = new Map<number, T[]>();
  for (let i = 0; i < signals.length; i += 1) {
    const root = find(i);
    const cluster = clusters.get(root) ?? [];
    cluster.push(signals[i]);
    clusters.set(root, cluster);
  }

  const clustersList = Array.from(clusters.values());
  const clusteredCount = clustersList.reduce((total, cluster) => total + cluster.length, 0);

  if (clusteredCount !== signals.length) {
    throw new Error(
      `groupSignals: clustering lost signals (${signals.length} in, ${clusteredCount} clustered)`,
    );
  }

  return clustersList;
}

function pickPrimarySignal<T extends GroupableSignal>(group: T[]): T {
  return group.reduce((best, current) => {
    if (current.relevance > best.relevance) {
      return current;
    }
    if (current.relevance < best.relevance) {
      return best;
    }
    return current.event_date.localeCompare(best.event_date) > 0 ? current : best;
  });
}

function toGroupedSources<T extends GroupableSignal>(group: T[]): GroupedSignalSource[] {
  const seen = new Set<string>();

  return group
    .map((signal) => ({
      id: signal.id,
      source_url: signal.source_url,
      summary: signal.summary,
      relevance: signal.relevance,
      event_date: signal.event_date,
      captured_at: signal.captured_at,
    }))
    .filter((source) => {
      if (seen.has(source.id)) {
        return false;
      }
      seen.add(source.id);
      return true;
    })
    .sort((a, b) => {
      if (b.relevance !== a.relevance) {
        return b.relevance - a.relevance;
      }
      return b.event_date.localeCompare(a.event_date);
    });
}

function buildGroupedSignal<T extends GroupableSignal>(group: T[]): WithGroupedSources<T> {
  if (group.length === 0) {
    throw new Error("groupSignals: cannot build group from empty cluster");
  }

  if (group.length === 1) {
    return stripGroupedMetadata(group[0] as WithGroupedSources<T>);
  }

  const primary = pickPrimarySignal(group);
  const groupedSources = toGroupedSources(group);

  if (groupedSources.length !== group.length) {
    throw new Error(
      `groupSignals: grouped_sources length ${groupedSources.length} does not match cluster size ${group.length}`,
    );
  }

  if (!groupedSources.some((source) => source.id === primary.id)) {
    throw new Error(
      `groupSignals: primary signal ${primary.id} missing from grouped_sources`,
    );
  }

  return {
    ...primary,
    grouped_sources: groupedSources,
    source_count: groupedSources.length,
  };
}

function assertNoSignalsDropped<T extends GroupableSignal>(
  input: T[],
  output: WithGroupedSources<T>[],
): void {
  const inputIds = input.map((signal) => signal.id);
  const uniqueInputIds = new Set(inputIds);

  if (uniqueInputIds.size !== inputIds.length) {
    throw new Error("groupSignals: duplicate signal ids in input");
  }

  const accountedIds = new Set<string>();
  for (const row of output) {
    accountedIds.add(row.id);
    for (const source of row.grouped_sources ?? []) {
      accountedIds.add(source.id);
    }
  }

  const dropped = inputIds.filter((id) => !accountedIds.has(id));
  if (dropped.length > 0) {
    throw new Error(
      `groupSignals: dropped ${dropped.length} signal(s): ${dropped.join(", ")}`,
    );
  }

  if (accountedIds.size < uniqueInputIds.size) {
    throw new Error(
      `groupSignals: accounted for ${accountedIds.size} signal(s) but received ${uniqueInputIds.size} input signal(s)`,
    );
  }

  if (output.length > input.length) {
    throw new Error(
      `groupSignals: output has more rows (${output.length}) than input (${input.length})`,
    );
  }
}

/**
 * Group signals that share a category and fall within the 24-hour window.
 * When actor_names are present, signals must also share at least one actor.
 * Pass scopeActor when grouping per actor card on Market Pulse.
 *
 * Never drops input signals: each id appears on a primary row or in grouped_sources.
 * Singleton clusters are returned as-is (no sources badge).
 */
export function groupSignals<T extends GroupableSignal>(
  signals: WithGroupedSources<T>[],
  options?: { scopeActor?: string },
): WithGroupedSources<T>[] {
  const scopeLabel = options?.scopeActor ? ` scopeActor=${options.scopeActor}` : "";
  console.log(
    `[groupSignals] start input=${signals.length} rows${scopeLabel}`,
  );

  if (signals.length === 0) {
    console.log("[groupSignals] end output=0 rows (empty input)");
    return [];
  }

  const flattened = flattenInputSignals(signals);
  if (flattened.length !== signals.length) {
    console.log(
      `[groupSignals] flattened ${signals.length} rows → ${flattened.length} signals`,
    );
  }

  const scoped = options?.scopeActor
    ? flattened.map((signal) => ({
        ...signal,
        actor_names: [options.scopeActor],
      }))
    : flattened;

  const output = clusterSignals(scoped).map((group) => buildGroupedSignal(group));
  assertNoSignalsDropped(scoped, output);

  const outputSignalIds = new Set<string>();
  for (const row of output) {
    outputSignalIds.add(row.id);
    for (const source of row.grouped_sources ?? []) {
      outputSignalIds.add(source.id);
    }
  }

  console.log(
    `[groupSignals] end output=${output.length} rows, ${outputSignalIds.size} signal ids accounted${scopeLabel}`,
  );

  return output;
}

export function maxRelevanceInTemporalWindow(
  records: Array<{
    actorIds: string[];
    category: string;
    eventDate: string;
    relevance: number;
  }>,
  actorIds: string[],
  category: string,
  eventDate: string,
): number {
  let max = 0;

  for (const record of records) {
    if (record.category !== category) {
      continue;
    }
    if (!datesWithinGroupWindow(record.eventDate, eventDate)) {
      continue;
    }
    if (!record.actorIds.some((id) => actorIds.includes(id))) {
      continue;
    }
    max = Math.max(max, record.relevance);
  }

  return max;
}
