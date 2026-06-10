import { NextRequest, NextResponse } from "next/server";
import { resolveDomainSlug } from "@/lib/config-loader";
import { runReEnrich } from "@/lib/re-enrichment";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const slug = resolveDomainSlug(request.nextUrl.searchParams.get("domain"));
    const sourceUrls = request.nextUrl.searchParams.getAll("url");
    const summary = await runReEnrich(
      slug,
      sourceUrls.length > 0 ? { sourceUrls } : undefined,
    );

    return NextResponse.json({
      ok: summary.errors.length === 0,
      domain: slug,
      ...summary,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown re-enrichment error";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
