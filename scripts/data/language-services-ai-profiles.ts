export interface ActorProfileSeed {
  actor_name: string;
  description: string;
  business_model: string;
  ai_strategy: string;
  recent_moves: string;
  revenue_usd: number | null;
  revenue_year: number | null;
  headcount_approx: string | null;
  hq: string | null;
  core_products: string[];
  core_technology: string[];
  key_markets: string[];
}

/** Tier 1 actor profiles for language-services-ai */
export const PROFILES: ActorProfileSeed[] = [
  {
    actor_name: "TransPerfect",
    description:
      "World's largest language service provider. Combines human translation with proprietary AI technology. Strong in regulated industries: legal, financial, life sciences.",
    business_model: "Enterprise LSP + technology platform (GlobalLink suite)",
    revenue_usd: 1_320_000_000,
    revenue_year: 2024,
    headcount_approx: "~6,000",
    hq: "New York, US",
    core_products: [
      "GlobalLink TMS",
      "TowerLLM",
      "GlobalLink AI",
      "TransPerfect Media",
    ],
    core_technology: [
      "TowerLLM (acquired Unbabel Aug 2025)",
      "GlobalLink suite",
      "COMET evaluation",
    ],
    key_markets: [
      "Legal",
      "Financial services",
      "Life sciences",
      "Media & entertainment",
    ],
    ai_strategy:
      "Vertical integration — acquired Unbabel Aug 2025 to own a proprietary LLM for translation. TowerLLM folded into GlobalLink. Positioning as AI orchestration platform, not just LSP.",
    recent_moves:
      "Acquired Unbabel (Aug 2025). Opened first Saudi Arabia office (Nov 2025). Multiple media-localization acquisitions in 2025.",
  },
  {
    actor_name: "RWS",
    description:
      "UK-based LSP and language technology group. Repositioning from traditional translation toward AI-enabled content operations and IP services.",
    business_model: "Enterprise LSP + language technology (Language Weaver MT engine)",
    revenue_usd: null,
    revenue_year: 2024,
    headcount_approx: "~7,500",
    hq: "Chalfont St Peter, UK",
    core_products: [
      "Language Weaver (MT engine)",
      "Trados TMS",
      "Heliport",
      "IP services",
    ],
    core_technology: ["Language Weaver NMT", "Trados ecosystem"],
    key_markets: ["IP & patents", "Life sciences", "Legal", "Enterprise content"],
    ai_strategy:
      "Consolidated MT capabilities via SDL and Iconic acquisitions, relaunched as Language Weaver. CEO Ben Faes repositioning RWS as technology-led. Processed 1 trillion words in past year.",
    recent_moves:
      "Acquired Obviously Group for £40M (2026). CEO Ben Faes interviewed on SlatorPod Apr 2026 on AI strategy.",
  },
  {
    actor_name: "Lionbridge",
    description:
      "Global LSP with strong gaming and life sciences verticals. AI-human hybrid model. New CEO appointed 2026.",
    business_model: "Enterprise LSP + AI-human hybrid workflows",
    revenue_usd: null,
    revenue_year: 2024,
    headcount_approx: "~6,000",
    hq: "Waltham, MA, US",
    core_products: [
      "Lionbridge Lainguage Cloud",
      "Lionbridge Samurai (gaming)",
      "Smart MT",
    ],
    core_technology: [
      "LLM-assisted post-editing",
      "Lionbridge Samurai AI (gaming, 2025)",
    ],
    key_markets: ["Gaming", "Life sciences", "Technology", "Automotive"],
    ai_strategy:
      "AI-human hybrid claiming 40% cost reduction on MTPE projects. Samurai dedicated gaming localization AI launched 2025. Absorbed Gengo for crowdsourced translation data.",
    recent_moves:
      "Sebastian Bretschneider appointed CEO (2026). Launched Lionbridge Samurai for gaming (2025).",
  },
  {
    actor_name: "Welocalize",
    description:
      "Top-5 global LSP. Data-driven AI platform Opal optimizes multilingual content lifecycles. Strategic alliance with Phrase since Oct 2024.",
    business_model: "Enterprise LSP + AI platform (Opal)",
    revenue_usd: null,
    revenue_year: 2024,
    headcount_approx: "~2,000",
    hq: "Frederick, MD, US",
    core_products: [
      "Opal AI platform",
      "Translation & localization services",
      "MT + QE workflows",
    ],
    core_technology: [
      "Opal (MT, quality evaluation, linguistic assets)",
      "Phrase integration (Oct 2024)",
    ],
    key_markets: ["Technology", "E-commerce", "Life sciences", "Legal"],
    ai_strategy:
      "Opal platform unifies MT, quality evaluation and linguistic assets. Expanded strategic alliance with Phrase Oct 2024 to merge platform + delivery network.",
    recent_moves: "Phrase-Welocalize strategic alliance expanded Oct 2024.",
  },
  {
    actor_name: "Keywords Studios",
    description:
      "Gaming-focused LSP and content services group. Acquired by EQT for £2.1B in 2024. Close to $1B revenue.",
    business_model: "Enterprise LSP + gaming services conglomerate",
    revenue_usd: null,
    revenue_year: 2024,
    headcount_approx: "~12,000",
    hq: "Dublin, Ireland",
    core_products: [
      "Game localization",
      "QA testing",
      "Audio & dubbing",
      "Player support",
    ],
    core_technology: [
      "KantanMT (acquired)",
      "Proprietary gaming localization platform",
    ],
    key_markets: ["Gaming", "Entertainment", "Interactive media"],
    ai_strategy:
      "PE-backed by EQT (£2.1B deal). Proprietary AI platforms developed and acquired. Third-largest LSP by revenue with strong gaming sector growth.",
    recent_moves:
      "EQT acquisition closed 2024. Gaming sector growth drove Nimdzi top 3 ranking.",
  },
  {
    actor_name: "Translated",
    description:
      "Italian LSP and AI research company. Built ModernMT open-source MT engine. Lara AI engine expanded to 200 languages Nov 2025.",
    business_model: "LSP + AI research + open-source MT",
    revenue_usd: null,
    revenue_year: 2024,
    headcount_approx: "~300",
    hq: "Rome, Italy",
    core_products: [
      "Lara AI translation engine",
      "ModernMT (open-source)",
      "Translation API",
    ],
    core_technology: [
      "ModernMT (open-source adaptive NMT)",
      "Lara AI engine (200 languages, 40% higher human-eval scores)",
    ],
    key_markets: ["Enterprise API", "Developer ecosystem", "Research"],
    ai_strategy:
      "AI research-led. ModernMT open-source positions Translated as technical leader. Lara AI expansion to 200 languages with 76% quality gains on low-resource pairs (Nov 2025).",
    recent_moves:
      "Lara AI expanded to 200 languages with 40% higher human-evaluation scores (Nov 2025).",
  },
  {
    actor_name: "Acolad",
    description:
      "European LSP repositioning around Lia AI platform. Revenue declining 2022-2024 due to strategic refocus. Recovering.",
    business_model: "Enterprise LSP + AI content platform (Lia)",
    revenue_usd: null,
    revenue_year: 2024,
    headcount_approx: "~2,500",
    hq: "Paris, France",
    core_products: [
      "Lia AI platform",
      "Translation & localization",
      "Content creation",
    ],
    core_technology: [
      "Lia (content lifecycle AI — creation, translation, review, delivery)",
    ],
    key_markets: [
      "Enterprise content",
      "Marketing",
      "Legal",
      "Financial services",
    ],
    ai_strategy:
      "Full portfolio under Lia framework. AI-powered platform unifying content creation, translation, review, and delivery. R&D investment to recover from strategic refocus losses.",
    recent_moves:
      "Lia platform launched as unified AI content lifecycle product. Recovering from 2023 revenue losses.",
  },
  {
    actor_name: "Appen",
    description:
      "AI training data and language services company. Provides human-annotated datasets for AI model training. Significant revenue decline in recent years.",
    business_model: "AI training data marketplace + annotation services",
    revenue_usd: null,
    revenue_year: 2024,
    headcount_approx: "~1,000 + crowd",
    hq: "Sydney, Australia",
    core_products: [
      "Appen Data Annotation Platform",
      "Crowd workforce",
      "AI model evaluation",
    ],
    core_technology: [
      "Crowd annotation platform",
      "Quality evaluation tooling",
    ],
    key_markets: [
      "AI/ML teams",
      "Search engines",
      "Autonomous vehicles",
      "NLP research",
    ],
    ai_strategy:
      "Pivoting from pure LSP to AI training data provider. Competes with Scale AI and Surge AI for model annotation contracts. Revenue under pressure from automated alternatives.",
    recent_moves: "Strategic pivot toward AI training data. Revenue under pressure.",
  },
  {
    actor_name: "DeepL",
    description:
      "European neural MT specialist. Best-in-class quality for European language pairs. Expanding into enterprise with DeepL Pro and Write.",
    business_model: "SaaS MT — freemium to enterprise",
    revenue_usd: null,
    revenue_year: 2024,
    headcount_approx: "~900",
    hq: "Cologne, Germany",
    core_products: ["DeepL Translator", "DeepL Pro", "DeepL Write", "DeepL API"],
    core_technology: [
      "Proprietary NMT engine",
      "DeepL Write (AI writing assistant)",
    ],
    key_markets: ["Enterprise (EU-focused)", "Developer API", "SMB"],
    ai_strategy:
      "Positioned as quality leader vs Google/Microsoft on European pairs. Expanding beyond translation into writing assistance (DeepL Write). 2026 Nimdzi 100 now ranks DeepL alongside legacy LSPs.",
    recent_moves:
      "Nimdzi 100 2026 placed DeepL on same ranking as legacy LSPs for first time — boundary between tech vendor and LSP dissolved.",
  },
  {
    actor_name: "ModernMT",
    description:
      "Open-source adaptive MT engine built by Translated. Learns from corrections in real time. Available as API and on-premise.",
    business_model: "Open-source MT engine + API",
    revenue_usd: null,
    revenue_year: 2024,
    headcount_approx: "<50",
    hq: "Rome, Italy",
    core_products: [
      "ModernMT engine",
      "ModernMT API",
      "On-premise deployment",
    ],
    core_technology: [
      "Adaptive NMT — learns from translator corrections in real time",
    ],
    key_markets: ["LSPs", "Enterprise IT", "Developer ecosystem"],
    ai_strategy:
      "Open-source strategy for ecosystem adoption. Real-time adaptation differentiates from static MT engines. Backed by Translated R&D.",
    recent_moves: "Part of Translated's broader Lara AI expansion.",
  },
  {
    actor_name: "SYSTRAN",
    description:
      "Oldest MT company (founded 1968). Now focused on secure, on-premise MT for enterprise and government. Part of KDDI group.",
    business_model: "On-premise MT + secure translation API",
    revenue_usd: null,
    revenue_year: 2024,
    headcount_approx: "~200",
    hq: "Paris, France",
    core_products: [
      "SYSTRAN Translate",
      "SYSTRAN Pure Neural MT",
      "On-premise secure deployment",
    ],
    core_technology: [
      "Pure Neural MT (PNMT)",
      "On-premise and air-gapped deployments",
    ],
    key_markets: [
      "Government",
      "Defense",
      "Regulated industries",
      "Enterprise security",
    ],
    ai_strategy:
      "Security and data sovereignty differentiator. On-premise deployment for organizations that cannot use cloud MT. Owned by KDDI (Japan).",
    recent_moves: "Continued focus on secure government and enterprise MT.",
  },
  {
    actor_name: "Phrase (Memsource)",
    description:
      "TMS and CAT tool platform for enterprise localization workflows. Pivoting to AI agent-based language intelligence.",
    business_model: "SaaS TMS/CAT platform — enterprise subscription",
    revenue_usd: null,
    revenue_year: 2024,
    headcount_approx: "~400",
    hq: "Prague, Czech Republic",
    core_products: [
      "Phrase TMS",
      "Phrase CAT",
      "Phrase Strings",
      "Phrase Language AI",
    ],
    core_technology: [
      "Language intelligence platform",
      "AI agent workflow support (2026)",
    ],
    key_markets: ["Enterprise software", "E-commerce", "Marketing localization"],
    ai_strategy:
      "Jun 2026: announced platform enhancements extending language intelligence across human and AI agent workflows. Strategic pivot to capture AI agent market while maintaining core human translation platform.",
    recent_moves:
      "Platform enhancement announcement Jun 2026 — language intelligence for AI agent workflows.",
  },
  {
    actor_name: "memoQ",
    description:
      "Hungarian CAT tool and TMS vendor. Strong in LSP and enterprise translator workflows. Known for translator-friendly UX.",
    business_model: "Desktop + cloud CAT/TMS — perpetual + subscription",
    revenue_usd: null,
    revenue_year: 2024,
    headcount_approx: "~200",
    hq: "Budapest, Hungary",
    core_products: [
      "memoQ translator pro",
      "memoQ server TMS",
      "memoQ cloud",
    ],
    core_technology: [
      "CAT translation memory",
      "MT integration",
      "Quality assurance",
    ],
    key_markets: [
      "LSPs",
      "Enterprise translation teams",
      "Freelance translators",
    ],
    ai_strategy:
      "Integrating AI-assisted translation within established CAT workflow. Competing with Phrase for enterprise TMS. Strong translator loyalty as moat.",
    recent_moves: "Cloud offering expansion. AI integration within CAT tools.",
  },
  {
    actor_name: "XTM International",
    description:
      "UK-based TMS and CAT platform. Enterprise localization workflow automation. Competitor to Phrase and memoQ.",
    business_model: "SaaS TMS platform — enterprise subscription",
    revenue_usd: null,
    revenue_year: 2024,
    headcount_approx: "~150",
    hq: "Guildford, UK",
    core_products: ["XTM Cloud TMS", "XTM CAT editor", "XTM API"],
    core_technology: [
      "Cloud TMS",
      "MT integration hub",
      "Workflow automation",
    ],
    key_markets: [
      "Enterprise localization teams",
      "LSPs",
      "Regulated industries",
    ],
    ai_strategy:
      "AI integration within existing TMS workflows. Competes with Phrase on enterprise TMS. Less aggressive AI repositioning than Phrase.",
    recent_moves: "Continued enterprise TMS development.",
  },
  {
    actor_name: "Lilt",
    description:
      "AI-native translation platform combining LLMs with human review. Launched GAIA-v2 benchmark for multilingual AI agents.",
    business_model: "AI-native translation platform — enterprise SaaS",
    revenue_usd: null,
    revenue_year: 2024,
    headcount_approx: "~200",
    hq: "San Francisco, US",
    core_products: ["Lilt Translate", "Lilt Create", "GAIA benchmark"],
    core_technology: [
      "Human-in-the-loop LLM translation",
      "GAIA-v2 multilingual AI agent benchmark",
    ],
    key_markets: ["Enterprise technology", "Government & defense", "E-commerce"],
    ai_strategy:
      "Most AI-native of the major platforms. GAIA-v2 benchmark positions Lilt as thought leader in multilingual AI agents. Competes directly with traditional LSPs on quality + speed.",
    recent_moves:
      "Launched GAIA-v2 benchmark for multilingual AI agents (2026).",
  },
  {
    actor_name: "Unbabel",
    description:
      "AI-driven translation platform for multilingual customer support. Acquired by TransPerfect Aug 2025. TowerLLM and COMET now part of GlobalLink.",
    business_model: "Was: SaaS LangOps platform. Now: TransPerfect subsidiary",
    revenue_usd: null,
    revenue_year: 2024,
    headcount_approx: "~200 (pre-acquisition)",
    hq: "Lisbon, Portugal",
    core_products: [
      "TowerLLM (translation LLM)",
      "COMET (MT quality estimation)",
      "LangOps platform",
    ],
    core_technology: [
      "TowerLLM — LLM trained specifically for translation",
      "COMET — industry-standard MT quality evaluation",
    ],
    key_markets: [
      "Customer support",
      "CX platforms",
      "Enterprise multilingual content",
    ],
    ai_strategy:
      "Acquired by TransPerfect Aug 2025. TowerLLM and COMET folded into GlobalLink. Open-source Tower and COMET remain available. Unbabel's LangOps vision now inside TransPerfect's enterprise stack.",
    recent_moves:
      "Acquired by TransPerfect Aug 2025. Lifecycle status: archived as independent entity, tracked through TransPerfect.",
  },
];
