import { NextRequest, NextResponse } from "next/server";
import { resolveDomainSlug } from "@/lib/config-loader";
import { runEnrichmentValidation } from "@/lib/enrichment-validate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const slug = resolveDomainSlug(request.nextUrl.searchParams.get("domain"));
    const results = await runEnrichmentValidation(slug);
    const passCount = results.filter((item) => item.pass).length;

    return NextResponse.json({
      ok: passCount === results.length,
      domain: slug,
      passCount,
      total: results.length,
      results,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown validation error";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
