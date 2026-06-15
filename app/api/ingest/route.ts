import { NextRequest, NextResponse } from "next/server";
import { resolveDomainSlug } from "@/lib/config-loader";
import { parseIngestDateRange } from "@/lib/ingest/date-range";
import { runIngest } from "@/lib/ingest/pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

async function readDateParams(request: NextRequest): Promise<{
  from: string | null;
  to: string | null;
  source: "query" | "body" | "default";
}> {
  const fromQuery = request.nextUrl.searchParams.get("from");
  const toQuery = request.nextUrl.searchParams.get("to");

  if (fromQuery || toQuery) {
    return { from: fromQuery, to: toQuery, source: "query" };
  }

  if (request.method === "POST") {
    try {
      const body = (await request.json()) as {
        from?: string;
        to?: string;
      };
      const fromBody = body.from?.trim() || null;
      const toBody = body.to?.trim() || null;
      if (fromBody || toBody) {
        return { from: fromBody, to: toBody, source: "body" };
      }
    } catch {
      // POST without JSON body
    }
  }

  return { from: null, to: null, source: "default" };
}

async function handleIngest(request: NextRequest) {
  try {
    const slug = resolveDomainSlug(request.nextUrl.searchParams.get("domain"));
    const { from, to, source } = await readDateParams(request);

    console.log(
      `[ingest:route] from=${from ?? "(none)"} to=${to ?? "(none)"} source=${source}`,
    );

    const dateRange = parseIngestDateRange(from, to);

    console.log(
      `[ingest:route] resolved date_range ${dateRange.fromDate} → ${dateRange.toDate} explicit=${dateRange.explicit}`,
    );

    const summary = await runIngest(slug, dateRange);

    return NextResponse.json({
      ok: summary.errors.length === 0,
      domain: slug,
      ...summary,
      params: { from, to, source },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown ingest error";

    const status = message.includes("must be") ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

/** Vercel cron jobs invoke scheduled routes with GET. */
export async function GET(request: NextRequest) {
  return handleIngest(request);
}

export async function POST(request: NextRequest) {
  return handleIngest(request);
}
