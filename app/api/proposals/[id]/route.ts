import { NextRequest, NextResponse } from "next/server";
import { resolveProposal } from "@/lib/proposals";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = (await request.json()) as { action?: string };
    const action = body.action;

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { ok: false, error: 'action must be "approve" or "reject"' },
        { status: 400 },
      );
    }

    const proposal = await resolveProposal(params.id, action);

    return NextResponse.json({ ok: true, proposal });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown proposal error";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
