import type { LifecycleEvent, SignalCategory } from "./types";

export interface EnrichmentValidationCase {
  id: string;
  label: string;
  rawText: string;
  eventDate: string;
  expect: {
    category: SignalCategory;
    relevanceMin: number;
    lifecycle?: LifecycleEvent | null;
    actorsIncludes: string[];
    scheduledDate?: string | null;
  };
}

export const ENRICHMENT_VALIDATION_CASES: EnrichmentValidationCase[] = [
  {
    id: "lifecycle-ma",
    label: "USA Rare Earth acquires Serra Verde",
    rawText: `USA Rare Earth (NASDAQ: USAR) announced it has entered into a definitive agreement to acquire Serra Verde Group for approximately $2.8 billion in a combination of cash and stock. The deal gives USAR control of Serra Verde's rare earth operations in Brazil and is expected to close in April 2026 pending regulatory approval.`,
    eventDate: "2026-04-15",
    expect: {
      category: "team",
      relevanceMin: 3,
      lifecycle: "acquired",
      actorsIncludes: ["USA Rare Earth"],
    },
  },
  {
    id: "geopolitical-resourceu",
    label: "EU REsourceEU export restrictions",
    rawText: `The European Commission adopted export restrictions on rare earth waste and battery scrap under the REsourceEU plan, effective 2026. The measures aim to keep critical raw materials within the EU supply chain and require authorization for exports of listed waste streams.`,
    eventDate: "2026-03-01",
    expect: {
      category: "geopolitical",
      relevanceMin: 2,
      actorsIncludes: ["EU Commission"],
    },
  },
  {
    id: "commercial-loi",
    label: "USA Rare Earth $1.6B LOI with US Gov",
    rawText: `USA Rare Earth announced a letter of intent with the U.S. Government that would provide access to up to $1.6 billion in CHIPS Act funding for domestic rare earth mining and processing capacity. The non-binding LOI was signed in January 2026 and remains subject to final agreement and appropriations.`,
    eventDate: "2026-01-20",
    expect: {
      category: "commercial",
      relevanceMin: 3,
      actorsIncludes: ["USA Rare Earth"],
    },
  },
  {
    id: "scheduled-export-controls",
    label: "China export-control suspension expires 2026-11-10",
    rawText: `China's Ministry of Commerce (MOFCOM) confirmed that the temporary suspension of the second wave of rare earth export controls remains in place through November 10, 2026, after which licensing requirements with extraterritorial reach are scheduled to resume unless extended.`,
    eventDate: "2026-06-01",
    expect: {
      category: "geopolitical",
      relevanceMin: 3,
      actorsIncludes: ["MOFCOM"],
      scheduledDate: "2026-11-10",
    },
  },
];
