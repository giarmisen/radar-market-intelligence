import { ActorProfileDetail } from "@/components/ActorProfileDetail";
import { Hero } from "@/components/Hero";
import { Nav } from "@/components/Nav";
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
    <>
      <Nav active="actors" pendingProposals={data.pendingProposals} />
      <Hero
        eyebrow={data.domainName}
        title={data.actor.name}
        sub="Actor profile — business context, AI strategy, and linked signals."
        stats={[
          { value: data.stats.signals, label: "Signals" },
          { value: data.stats.critical, label: "Critical" },
          { value: data.actor.tier, label: "Tier" },
        ]}
      />
      <main className="radar-page-main">
        <ActorProfileDetail data={data} />
      </main>
    </>
  );
}
