import { NextRequest, NextResponse } from "next/server";
import { resolveDomainSlug } from "@/lib/config-loader";
import { runIngest } from "@/lib/ingest/pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

async function handleIngest(request: NextRequest) {
  try {
    const slug = resolveDomainSlug(request.nextUrl.searchParams.get("domain"));
    const summary = await runIngest(slug);

    return NextResponse.json({
      ok: summary.errors.length === 0,
      domain: slug,
      ...summary,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown ingest error";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/** Vercel cron jobs invoke scheduled routes with GET. */
export async function GET(request: NextRequest) {
  return handleIngest(request);
}

export async function POST(request: NextRequest) {
  return handleIngest(request);
}
