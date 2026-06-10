import { ENRICHMENT_VALIDATION_CASES } from "./enrichment-cases";
import { enrichSignal, enrichmentContextFromConfig } from "./enrichment";
import { loadDomainConfig } from "./config-loader";
import type { EnrichmentResult } from "./types";

export interface ValidationCaseResult {
  id: string;
  label: string;
  pass: boolean;
  result?: EnrichmentResult;
  failures: string[];
  error?: string;
}

function checkCase(
  result: EnrichmentResult,
  expect: (typeof ENRICHMENT_VALIDATION_CASES)[number]["expect"],
): string[] {
  const failures: string[] = [];

  if (result.category !== expect.category) {
    failures.push(`category: expected ${expect.category}, got ${result.category}`);
  }

  if (result.relevance < expect.relevanceMin) {
    failures.push(
      `relevance: expected >= ${expect.relevanceMin}, got ${result.relevance}`,
    );
  }

  if (expect.lifecycle !== undefined && result.lifecycle !== expect.lifecycle) {
    failures.push(
      `lifecycle: expected ${String(expect.lifecycle)}, got ${String(result.lifecycle)}`,
    );
  }

  for (const actor of expect.actorsIncludes) {
    if (!result.actors.includes(actor)) {
      failures.push(`actors: missing ${actor} (got ${result.actors.join(", ")})`);
    }
  }

  if (expect.scheduledDate !== undefined) {
    if (result.scheduled_date !== expect.scheduledDate) {
      failures.push(
        `scheduled_date: expected ${String(expect.scheduledDate)}, got ${String(result.scheduled_date)}`,
      );
    }
  }

  return failures;
}

export async function runEnrichmentValidation(
  domainSlug = "rare-earths",
): Promise<ValidationCaseResult[]> {
  const config = loadDomainConfig(domainSlug);
  const context = enrichmentContextFromConfig(config);
  const results: ValidationCaseResult[] = [];

  for (const testCase of ENRICHMENT_VALIDATION_CASES) {
    try {
      const result = await enrichSignal({
        rawText: testCase.rawText,
        eventDate: testCase.eventDate,
        context,
      });
      const failures = checkCase(result, testCase.expect);

      results.push({
        id: testCase.id,
        label: testCase.label,
        pass: failures.length === 0,
        result,
        failures,
      });
    } catch (error) {
      results.push({
        id: testCase.id,
        label: testCase.label,
        pass: false,
        failures: [],
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}
