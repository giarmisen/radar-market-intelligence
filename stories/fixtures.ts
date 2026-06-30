import type {
  ActorCard,
  LivingDocumentPageData,
  LivingDocumentSignal,
  UpcomingEvent,
} from "@/lib/living-document";
import type { TimelineRow } from "@/lib/timeline";
import type { SignalCategory } from "@/lib/types";

export const DOMAIN_NAME = "Language Services & Language AI";

export const SIGNAL_CATEGORIES: SignalCategory[] = [
  "product",
  "regulatory",
  "geopolitical",
  "commercial",
  "team",
  "communications",
  "technical",
];

export function recentCapture(): string {
  return new Date().toISOString();
}

export function languageServicesSignal(
  overrides: Partial<LivingDocumentSignal> = {},
): LivingDocumentSignal {
  return {
    id: "sig-deepl-write-pro",
    title: "DeepL Write Pro for enterprise localization",
    summary:
      "DeepL launched Write Pro for enterprise localization teams, adding glossary-aware post-editing and TMS export for Phrase and memoQ workflows.",
    so_what:
      "Raises the bar for AI-assisted enterprise translation. LSPs will need comparable quality claims in RFP responses.",
    category: "product",
    relevance: 2,
    event_date: "2026-03-12",
    lifecycle: null,
    source_url: "https://slator.com/deepl-write-pro-enterprise-localization/",
    captured_at: null,
    actor_names: ["DeepL"],
    ...overrides,
  };
}

export const CATEGORY_SIGNAL_COPY: Record<
  SignalCategory,
  Pick<LivingDocumentSignal, "title" | "summary" | "so_what" | "source_url" | "actor_names">
> = {
  product: {
    title: "Phrase launches AI quality estimation",
    summary:
      "Phrase shipped in-context AI quality estimation across Memsource projects, scoring segment-level MT output before human review.",
    so_what:
      "Pushes TMS vendors deeper into MTQA, relevant for LSPs pricing post-editing on high-volume programs.",
    source_url: "https://slator.com/phrase-ai-quality-estimation/",
    actor_names: ["Phrase (Memsource)"],
  },
  regulatory: {
    title: "EU AI Act disclosure rules for LSPs",
    summary:
      "European Commission guidance clarifies when language service providers must disclose machine translation use in regulated sectors.",
    so_what:
      "Compliance teams at Tier 1 LSPs will need client-facing MT disclosure workflows before Q3 audits.",
    source_url: "https://multilingual.com/eu-ai-act-lsp-disclosure/",
    actor_names: ["European Commission DGT"],
  },
  geopolitical: {
    title: "US export controls on translation models",
    summary:
      "BIS proposed export licensing for large multilingual models above a compute threshold, including commercial MT APIs.",
    so_what:
      "Could restrict cross-border deployment for US hyperscaler MT and affect LSPs serving restricted industries.",
    source_url: "https://slator.com/us-export-controls-translation-models/",
    actor_names: ["US Executive Order on AI (OSTP)"],
  },
  commercial: {
    title: "RWS wins pharma localization mandate",
    summary:
      "RWS signed a multi-year localization and regulatory submission mandate with a top-10 pharmaceutical company.",
    so_what:
      "Signals continued enterprise spend on regulated content, with competitive pressure on TransPerfect and Lionbridge in life sciences.",
    source_url: "https://slator.com/rws-pharma-localization-contract/",
    actor_names: ["RWS"],
  },
  team: {
    title: "Lionbridge names former Google Translate lead as CTO",
    summary:
      "Lionbridge appointed a former Google Translate engineering lead as CTO to accelerate its AI-first platform roadmap.",
    so_what:
      "Suggests Tier 1 LSPs are prioritizing in-house MT orchestration over pure vendor relationships.",
    source_url: "https://slator.com/lionbridge-cto-google-translate/",
    actor_names: ["Lionbridge"],
  },
  communications: {
    title: "TransPerfect and Lilt partner at LocWorld",
    summary:
      "TransPerfect and Lilt announced a joint go-to-market for human-in-the-loop AI translation at LocWorld Silicon Valley.",
    so_what:
      "Shows LSP + AI vendor bundling as a competitive response to hyperscaler MT pricing.",
    source_url: "https://slator.com/transperfect-lilt-locworld-partnership/",
    actor_names: ["TransPerfect", "Lilt"],
  },
  technical: {
    title: "ModernMT open-sources domain adaptation toolkit",
    summary:
      "ModernMT released an open toolkit for domain-adaptive NMT fine-tuning aimed at enterprise localization engineering teams.",
    so_what:
      "Lowers the barrier for LSPs to run client-specific MT without full custom model builds.",
    source_url: "https://slator.com/modernmt-domain-adaptation-toolkit/",
    actor_names: ["ModernMT"],
  },
};

export function signalForCategory(category: SignalCategory): LivingDocumentSignal {
  const copy = CATEGORY_SIGNAL_COPY[category];
  return languageServicesSignal({
    id: `sig-${category}`,
    category,
    relevance: 2,
    ...copy,
  });
}

export const UPCOMING_LOCWORLD: UpcomingEvent = {
  id: "upcoming-locworld",
  title: "LocWorld Silicon Valley: Language AI track",
  scheduled_date: "2026-04-22",
  so_what: "Key venue for LSP product launches and partnership announcements.",
  category: "communications",
};

export const WORTH_WATCHING_SIGNALS: LivingDocumentSignal[] = [
  languageServicesSignal({
    id: "sig-worth-deepl",
    relevance: 3,
    captured_at: recentCapture(),
    summary:
      "DeepL announced EU sovereign cloud hosting for enterprise MT, targeting regulated buyers that cannot use US-only inference.",
    so_what:
      "Directly challenges RWS and TransPerfect sovereign AI narratives in European public sector RFPs.",
    source_url: "https://slator.com/deepl-eu-sovereign-cloud/",
    actor_names: ["DeepL"],
  }),
  languageServicesSignal({
    id: "sig-worth-meta",
    relevance: 3,
    category: "technical",
    summary:
      "Meta AI expanded NLLB coverage to 12 low-resource languages prioritized by UN agencies and NGO localization programs.",
    so_what:
      "May shift nonprofit and institutional translation spend away from traditional LSP per-word models.",
    source_url: "https://slator.com/meta-nllb-low-resource-expansion/",
    actor_names: ["Meta AI (NLLB)"],
  }),
  languageServicesSignal({
    id: "sig-worth-eu",
    relevance: 3,
    category: "regulatory",
    summary:
      "EU AI Act enforcement bodies published draft guidance on human oversight requirements for MT in medical device labeling.",
    so_what:
      "Life sciences LSPs face new compliance checkpoints before Q4 audit cycles.",
    source_url: "https://multilingual.com/eu-ai-act-mt-medical-labeling/",
    actor_names: ["EU AI Act enforcement bodies"],
  }),
];

function actorCard(overrides: Partial<ActorCard> & Pick<ActorCard, "id" | "name">): ActorCard {
  return {
    role: "processor",
    tier: 1,
    geography: ["US", "EU"],
    lastSignalDate: "2026-03-12",
    hasCritical: false,
    signals: [languageServicesSignal()],
    ...overrides,
  };
}

export function marketPulseData(): LivingDocumentPageData {
  const newTodaySignal = languageServicesSignal({
    id: "sig-deepl-1",
    relevance: 3,
    captured_at: recentCapture(),
    summary:
      "DeepL announced EU sovereign cloud hosting for enterprise MT, targeting regulated buyers that cannot use US-only inference.",
    actor_names: ["DeepL"],
    source_url: "https://slator.com/deepl-eu-sovereign-cloud/",
  });

  return {
    domainName: DOMAIN_NAME,
    domainSlug: "language-services-ai",
    pendingProposals: 2,
    upcoming: [UPCOMING_LOCWORLD],
    newToday: [newTodaySignal],
    worthWatching: WORTH_WATCHING_SIGNALS,
    stats: { actors: 6, signals: 18, upcoming: 1 },
    tiers: [
      {
        tier: 1,
        label: "Tier 1 (Focus)",
        actors: [
          actorCard({
            id: "actor-deepl",
            name: "DeepL",
            role: "processor",
            geography: ["DE", "EU"],
            hasCritical: true,
            signals: [
              languageServicesSignal({
                id: "sig-deepl-1",
                relevance: 3,
                captured_at: recentCapture(),
                summary:
                  "DeepL announced EU sovereign cloud hosting for enterprise MT, targeting regulated buyers that cannot use US-only inference.",
                so_what:
                  "Directly challenges RWS and TransPerfect sovereign AI narratives in European public sector RFPs.",
                source_url: "https://slator.com/deepl-eu-sovereign-cloud/",
              }),
              languageServicesSignal({
                id: "sig-deepl-2",
                summary:
                  "DeepL Write Pro added glossary-aware post-editing exports for Phrase and memoQ enterprise workflows.",
                source_url: "https://slator.com/deepl-write-pro-enterprise-localization/",
              }),
            ],
          }),
          actorCard({
            id: "actor-rws",
            name: "RWS",
            signals: [
              languageServicesSignal({
                id: "sig-rws-1",
                category: "commercial",
                summary:
                  "RWS signed a multi-year localization and regulatory submission mandate with a top-10 pharmaceutical company.",
                so_what:
                  "Signals continued enterprise spend on regulated content in life sciences.",
                source_url: "https://slator.com/rws-pharma-localization-contract/",
                actor_names: ["RWS"],
              }),
            ],
          }),
          actorCard({
            id: "actor-phrase",
            name: "Phrase (Memsource)",
            role: "processor",
            geography: ["CZ", "US"],
            signals: [
              languageServicesSignal({
                id: "sig-phrase-1",
                summary:
                  "Phrase shipped in-context AI quality estimation across Memsource projects before human review.",
                source_url: "https://slator.com/phrase-ai-quality-estimation/",
                actor_names: ["Phrase (Memsource)"],
              }),
            ],
          }),
        ],
      },
      {
        tier: 2,
        label: "Tier 2 (Peripheral)",
        actors: [
          actorCard({
            id: "actor-lilt",
            name: "Lilt",
            tier: 2,
            geography: ["US"],
            signals: [
              languageServicesSignal({
                id: "sig-lilt-1",
                category: "communications",
                summary:
                  "Lilt and TransPerfect announced a joint go-to-market for human-in-the-loop AI translation at LocWorld.",
                source_url: "https://slator.com/transperfect-lilt-locworld-partnership/",
                actor_names: ["Lilt", "TransPerfect"],
              }),
            ],
          }),
        ],
      },
    ],
  };
}

export function timelineRows(): TimelineRow[] {
  return [
    {
      id: "tl-deepl-sovereign",
      event_date: "2026-03-14",
      category: "product",
      relevance: 3,
      summary:
        "DeepL announced EU sovereign cloud hosting for enterprise MT, targeting regulated buyers that cannot use US-only inference.",
      so_what:
        "Directly challenges RWS and TransPerfect sovereign AI narratives in European public sector RFPs.",
      source_url: "https://slator.com/deepl-eu-sovereign-cloud/",
      lifecycle: null,
      captured_at: recentCapture(),
      actors: [{ id: "actor-deepl", name: "DeepL", tier: 1, role: "processor" }],
      top_tier: 1,
    },
    {
      id: "tl-eu-ai-act",
      event_date: "2026-03-10",
      category: "regulatory",
      relevance: 3,
      summary:
        "EU AI Act enforcement bodies published draft guidance on human oversight requirements for MT in medical device labeling.",
      so_what: "Life sciences LSPs face new compliance checkpoints before Q4 audit cycles.",
      source_url: "https://multilingual.com/eu-ai-act-mt-medical-labeling/",
      lifecycle: null,
      captured_at: null,
      actors: [
        { id: "actor-eu", name: "EU AI Act enforcement bodies", tier: 1, role: "regulator" },
      ],
      top_tier: 1,
    },
    {
      id: "tl-rws-pharma",
      event_date: "2026-03-08",
      category: "commercial",
      relevance: 2,
      summary:
        "RWS signed a multi-year localization and regulatory submission mandate with a top-10 pharmaceutical company.",
      so_what:
        "Signals continued enterprise spend on regulated content, with competitive pressure on TransPerfect and Lionbridge.",
      source_url: "https://slator.com/rws-pharma-localization-contract/",
      lifecycle: null,
      captured_at: null,
      actors: [{ id: "actor-rws", name: "RWS", tier: 1, role: "processor" }],
      top_tier: 1,
    },
    {
      id: "tl-lionbridge-cto",
      event_date: "2026-03-05",
      category: "team",
      relevance: 2,
      summary:
        "Lionbridge appointed a former Google Translate engineering lead as CTO to accelerate its AI-first platform roadmap.",
      so_what:
        "Suggests Tier 1 LSPs are prioritizing in-house MT orchestration over pure vendor relationships.",
      source_url: "https://slator.com/lionbridge-cto-google-translate/",
      lifecycle: null,
      captured_at: null,
      actors: [{ id: "actor-lionbridge", name: "Lionbridge", tier: 1, role: "processor" }],
      top_tier: 1,
    },
    {
      id: "tl-modernmt",
      event_date: "2026-02-28",
      category: "technical",
      relevance: 2,
      summary:
        "ModernMT released an open toolkit for domain-adaptive NMT fine-tuning aimed at enterprise localization engineering teams.",
      so_what:
        "Lowers the barrier for LSPs to run client-specific MT without full custom model builds.",
      source_url: "https://slator.com/modernmt-domain-adaptation-toolkit/",
      lifecycle: null,
      captured_at: null,
      actors: [{ id: "actor-modernmt", name: "ModernMT", tier: 2, role: "processor" }],
      top_tier: 2,
    },
    {
      id: "tl-meta-nllb",
      event_date: "2026-02-22",
      category: "technical",
      relevance: 3,
      summary:
        "Meta AI expanded NLLB coverage to 12 low-resource languages prioritized by UN agencies and NGO localization programs.",
      so_what:
        "May shift nonprofit and institutional translation spend away from traditional LSP per-word models.",
      source_url: "https://slator.com/meta-nllb-low-resource-expansion/",
      lifecycle: null,
      captured_at: null,
      actors: [{ id: "actor-meta", name: "Meta AI (NLLB)", tier: 2, role: "processor" }],
      top_tier: 2,
    },
  ];
}
