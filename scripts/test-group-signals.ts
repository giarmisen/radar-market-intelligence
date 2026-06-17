/**
 * Edge-case tests for groupSignals — run: npx tsx scripts/test-group-signals.ts
 */
import {
  groupSignals,
  SIGNAL_GROUP_WINDOW_HOURS,
  SIGNAL_GROUP_WINDOW_MS,
  type GroupableSignal,
  type WithGroupedSources,
} from "../lib/group-signals";

function mockSignal(
  id: string,
  overrides: Partial<GroupableSignal> = {},
): GroupableSignal {
  return {
    id,
    category: "product",
    event_date: "2026-06-17",
    relevance: 2,
    summary: `Summary for ${id}`,
    source_url: `https://example.com/${id}`,
    actor_names: ["Actor A"],
    ...overrides,
  };
}

function collectInputIds(input: WithGroupedSources<GroupableSignal>[]): Set<string> {
  const ids = new Set<string>();
  for (const signal of input) {
    if (signal.grouped_sources && signal.grouped_sources.length > 0) {
      for (const source of signal.grouped_sources) {
        ids.add(source.id);
      }
      continue;
    }
    ids.add(signal.id);
  }
  return ids;
}

function collectAccountedIds(
  output: WithGroupedSources<GroupableSignal>[],
): Set<string> {
  const ids = new Set<string>();
  for (const row of output) {
    ids.add(row.id);
    for (const source of row.grouped_sources ?? []) {
      ids.add(source.id);
    }
  }
  return ids;
}

function assertPreservesIds(
  name: string,
  input: WithGroupedSources<GroupableSignal>[],
  output: WithGroupedSources<GroupableSignal>[],
  expectedRowCount?: number,
): void {
  const inputIds = collectInputIds(input);
  const outputIds = collectAccountedIds(output);

  if (inputIds.size !== outputIds.size) {
    throw new Error(
      `${name}: id count mismatch — input ${inputIds.size}, output ${outputIds.size}\n` +
        `  missing: ${Array.from(inputIds).filter((id) => !outputIds.has(id)).join(", ")}\n` +
        `  extra: ${Array.from(outputIds).filter((id) => !inputIds.has(id)).join(", ")}`,
    );
  }

  for (const id of Array.from(inputIds)) {
    if (!outputIds.has(id)) {
      throw new Error(`${name}: lost signal id ${id}`);
    }
  }

  if (expectedRowCount !== undefined && output.length !== expectedRowCount) {
    throw new Error(
      `${name}: expected ${expectedRowCount} output rows, got ${output.length}`,
    );
  }

  console.log(`  ✓ ${name} (${input.length} in → ${output.length} rows, ${outputIds.size} ids)`);
}

function runCase(
  name: string,
  input: WithGroupedSources<GroupableSignal>[],
  options?: { scopeActor?: string; expectedRowCount?: number },
): void {
  const output = groupSignals(input, options);
  assertPreservesIds(name, input, output, options?.expectedRowCount);
}

console.log(
  `SIGNAL_GROUP_WINDOW_MS = ${SIGNAL_GROUP_WINDOW_MS} (${SIGNAL_GROUP_WINDOW_HOURS}h)\n`,
);

try {
  runCase(
    "same actor + category + same date groups",
    [
      mockSignal("a1", { relevance: 2 }),
      mockSignal("a2", { relevance: 3, source_url: "https://other.com/a2" }),
    ],
    { expectedRowCount: 1 },
  );

  runCase(
    "same actor + different category does not group",
    [
      mockSignal("b1", { category: "product" }),
      mockSignal("b2", { category: "commercial" }),
    ],
    { expectedRowCount: 2 },
  );

  runCase(
    "same actor + category + 3 days apart does not group",
    [
      mockSignal("c1", { event_date: "2026-06-17" }),
      mockSignal("c2", { event_date: "2026-06-14" }),
    ],
    { expectedRowCount: 2 },
  );

  runCase(
    "two group + one separate",
    [
      mockSignal("d1", { event_date: "2026-06-17", relevance: 2 }),
      mockSignal("d2", { event_date: "2026-06-17", relevance: 3 }),
      mockSignal("d3", {
        event_date: "2026-06-10",
        category: "communications",
      }),
    ],
    { expectedRowCount: 2 },
  );

  runCase("single signal passes through", [mockSignal("e1")], { expectedRowCount: 1 });

  const single = groupSignals([mockSignal("f1")])[0];
  if (single.grouped_sources !== undefined || single.source_count !== undefined) {
    throw new Error("single signal should not have grouped_sources or source_count");
  }
  console.log("  ✓ single signal has no sources badge metadata");

  runCase(
    "scopeActor groups per actor view",
    [
      mockSignal("g1", { actor_names: ["TransPerfect", "RWS"] }),
      mockSignal("g2", { actor_names: ["TransPerfect"], source_url: "https://x.com/g2" }),
    ],
    { scopeActor: "TransPerfect", expectedRowCount: 1 },
  );

  runCase(
    "different actors without shared actor do not group",
    [
      mockSignal("h1", { actor_names: ["TransPerfect"] }),
      mockSignal("h2", { actor_names: ["RWS"], source_url: "https://x.com/h2" }),
    ],
    { expectedRowCount: 2 },
  );

  runCase(
    "24h boundary: 1 day apart groups",
    [
      mockSignal("i1", { event_date: "2026-06-17" }),
      mockSignal("i2", { event_date: "2026-06-16", source_url: "https://x.com/i2" }),
    ],
    { expectedRowCount: 1 },
  );

  runCase(
    "24h boundary: 2 days apart does not group",
    [
      mockSignal("j1", { event_date: "2026-06-17" }),
      mockSignal("j2", { event_date: "2026-06-15", source_url: "https://x.com/j2" }),
    ],
    { expectedRowCount: 2 },
  );

  // Re-apply grouping to already-grouped output (must not lose ids)
  const firstPass = groupSignals([
    mockSignal("k1", { relevance: 2 }),
    mockSignal("k2", { relevance: 3, source_url: "https://x.com/k2" }),
  ]);
  runCase("re-grouping already grouped output", firstPass, { expectedRowCount: 1 });

  const grouped = groupSignals([
    mockSignal("l1", { relevance: 2 }),
    mockSignal("l2", { relevance: 3, source_url: "https://x.com/l2" }),
  ])[0];
  if (grouped.source_count !== 2 || grouped.grouped_sources?.length !== 2) {
    throw new Error("grouped row should have source_count 2");
  }
  if (grouped.relevance !== 3) {
    throw new Error("primary should be highest relevance signal");
  }
  console.log("  ✓ highest relevance signal is primary");

  console.log("\nAll groupSignals tests passed.");
} catch (error) {
  console.error("\nFAILED:", error instanceof Error ? error.message : error);
  process.exit(1);
}
