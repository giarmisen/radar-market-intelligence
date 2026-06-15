import { NextRequest, NextResponse } from "next/server";
import { resolveDomainSlug } from "@/lib/config-loader";
import {
  generateQuarterlyReview,
} from "@/lib/quarterly-review";
import { parseReportDateRange } from "@/lib/report-date-range";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      domain?: string;
      from?: string;
      to?: string;
    };

    const slug = resolveDomainSlug(
      body.domain ?? request.nextUrl.searchParams.get("domain"),
    );
    const { from, to } = parseReportDateRange(body.from, body.to);
    const result = await generateQuarterlyReview({ domainSlug: slug, from, to });

    return NextResponse.json({
      ok: true,
      markdown: result.markdown,
      meta: result.meta,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown report error";

    const status = message.includes("must be") ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
