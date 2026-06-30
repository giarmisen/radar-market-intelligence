import { ActorProfileDetail } from "@/components/ActorProfileDetail";
import { AppShell } from "@/components/AppShell";
import { PageTopbar } from "@/components/PageTopbar";
import { getActorProfilePageData } from "@/lib/actor-profile";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface ActorProfilePageProps {
  params: { slug: string };
}

export default async function ActorProfilePage({ params }: ActorProfilePageProps) {
  const data = await getActorProfilePageData(params.slug);

  if (!data) {
    notFound();
  }

  return (
    <AppShell active="actors" pendingProposals={data.pendingProposals}>
      <PageTopbar
        title={data.actor.name}
        subtitle="Actor profile: business context, AI strategy, and linked signals."
      />
      <div className="radar-content">
        <ActorProfileDetail data={data} />
      </div>
    </AppShell>
  );
}
