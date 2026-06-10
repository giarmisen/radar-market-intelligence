import { NextRequest, NextResponse } from "next/server";
import { loadDomainConfig, resolveDomainSlug } from "@/lib/config-loader";
import {
  enrichSignal,
  enrichmentContextFromConfig,
} from "@/lib/enrichment";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      raw_text?: string;
      event_date?: string;
      domain?: string;
    };

    if (!body.raw_text?.trim()) {
      return NextResponse.json(
        { ok: false, error: "raw_text is required" },
        { status: 400 },
      );
    }

    const slug = resolveDomainSlug(body.domain);
    const config = loadDomainConfig(slug);
    const eventDate =
      body.event_date?.trim() || new Date().toISOString().slice(0, 10);

    const result = await enrichSignal({
      rawText: body.raw_text.trim(),
      eventDate,
      context: enrichmentContextFromConfig(config),
    });

    return NextResponse.json({ ok: true, domain: slug, result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown enrichment error";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
