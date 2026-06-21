import { ActorsRegistry } from "@/components/ActorsRegistry";
import { AppShell } from "@/components/AppShell";
import { PageTopbar } from "@/components/PageTopbar";
import { getActorsPageData } from "@/lib/actors-page";

export const dynamic = "force-dynamic";

export default async function ActorsPage() {
  const data = await getActorsPageData();

  return (
    <AppShell active="actors" pendingProposals={data.pendingProposals}>
      <PageTopbar
        title="Actors"
        subtitle="Tracked actor registry — tier, role, geography, and lifecycle status."
      />
      <div className="radar-content">
        {data.tiers.length === 0 ? (
          <p className="radar-empty">
            No actors seeded yet. Run POST /api/seed to load the domain registry.
          </p>
        ) : (
          <ActorsRegistry data={data} />
        )}
      </div>
    </AppShell>
  );
}
