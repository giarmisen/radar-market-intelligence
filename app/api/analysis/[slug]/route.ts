import { NextRequest, NextResponse } from "next/server";
import { generateActorAnalysis } from "@/lib/actor-analysis";
import { resolveDomainSlug } from "@/lib/config-loader";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface AnalysisRouteProps {
  params: { slug: string };
}

export async function POST(request: NextRequest, { params }: AnalysisRouteProps) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      domain?: string;
    };
    const domain = resolveDomainSlug(
      body.domain ?? request.nextUrl.searchParams.get("domain") ?? undefined,
    );

    const report = await generateActorAnalysis(params.slug, domain);

    return NextResponse.json({ ok: true, report });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown analysis error";

    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
