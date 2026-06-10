import { getSupabase } from "./supabase";

export type ProposalType =
  | "promote_actor"
  | "demote_actor"
  | "new_actor"
  | "archive_actor"
  | "new_tier0_source";

export type ProposalStatus = "pending" | "approved" | "rejected";

export interface ProposalRecord {
  id: string;
  domain_id: string;
  type: ProposalType;
  status: ProposalStatus;
  rationale: string;
  evidence_signal_ids: string[] | null;
  subject_actor_id: string | null;
  subject_source_id: string | null;
  created_at: string;
}

async function getProposal(id: string): Promise<ProposalRecord> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("proposals")
    .select(
      "id, domain_id, type, status, rationale, evidence_signal_ids, subject_actor_id, subject_source_id, created_at",
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    throw new Error(`Proposal not found: ${id}`);
  }

  return data as ProposalRecord;
}

async function applyApprovedProposal(proposal: ProposalRecord): Promise<void> {
  const supabase = getSupabase();

  if (proposal.type === "promote_actor" && proposal.subject_actor_id) {
    const { data: actor, error } = await supabase
      .from("actors")
      .select("tier")
      .eq("id", proposal.subject_actor_id)
      .single();

    if (error || !actor) {
      throw new Error(`Actor not found for promotion: ${error?.message}`);
    }

    const { error: updateError } = await supabase
      .from("actors")
      .update({ tier: Math.max(0, actor.tier - 1) })
      .eq("id", proposal.subject_actor_id);

    if (updateError) {
      throw new Error(`Failed to promote actor: ${updateError.message}`);
    }
    return;
  }

  if (proposal.type === "demote_actor" && proposal.subject_actor_id) {
    const { data: actor, error } = await supabase
      .from("actors")
      .select("tier")
      .eq("id", proposal.subject_actor_id)
      .single();

    if (error || !actor) {
      throw new Error(`Actor not found for demotion: ${error?.message}`);
    }

    const { error: updateError } = await supabase
      .from("actors")
      .update({ tier: Math.min(3, actor.tier + 1) })
      .eq("id", proposal.subject_actor_id);

    if (updateError) {
      throw new Error(`Failed to demote actor: ${updateError.message}`);
    }
    return;
  }

  if (proposal.type === "archive_actor" && proposal.subject_actor_id) {
    const { error: updateError } = await supabase
      .from("actors")
      .update({ status: "archived_shutdown" })
      .eq("id", proposal.subject_actor_id);

    if (updateError) {
      throw new Error(`Failed to archive actor: ${updateError.message}`);
    }
    return;
  }

  if (proposal.type === "new_tier0_source" && proposal.subject_source_id) {
    const { error: updateError } = await supabase
      .from("sources")
      .update({ is_tier0: true, status: "active" })
      .eq("id", proposal.subject_source_id);

    if (updateError) {
      throw new Error(`Failed to promote source: ${updateError.message}`);
    }
  }
}

export async function resolveProposal(
  id: string,
  action: "approve" | "reject",
): Promise<ProposalRecord> {
  const proposal = await getProposal(id);

  if (proposal.status !== "pending") {
    throw new Error(`Proposal already ${proposal.status}`);
  }

  const supabase = getSupabase();
  const resolvedAt = new Date().toISOString();

  if (action === "approve") {
    await applyApprovedProposal(proposal);
  }

  const { data, error } = await supabase
    .from("proposals")
    .update({
      status: action === "approve" ? "approved" : "rejected",
      resolved_at: resolvedAt,
    })
    .eq("id", id)
    .select(
      "id, domain_id, type, status, rationale, evidence_signal_ids, subject_actor_id, subject_source_id, created_at",
    )
    .single();

  if (error || !data) {
    throw new Error(`Failed to resolve proposal: ${error?.message}`);
  }

  return data as ProposalRecord;
}
