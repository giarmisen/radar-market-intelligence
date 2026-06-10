import { NextRequest, NextResponse } from "next/server";
import { loadDomainConfig, resolveDomainSlug } from "@/lib/config-loader";
import { seedDomain } from "@/lib/seed";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const slug = resolveDomainSlug(request.nextUrl.searchParams.get("domain"));
    const config = loadDomainConfig(slug);
    const result = await seedDomain(config);

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown seed error";

    const isPermission =
      message.includes("permission denied") ||
      message.includes("row-level security");

    return NextResponse.json(
      {
        ok: false,
        error: message,
        hint: isPermission
          ? "Run supabase/grants.sql in the Supabase SQL Editor, then retry. Restart `npm run dev` after updating .env.local."
          : undefined,
      },
      { status: 500 },
    );
  }
}
