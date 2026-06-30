"use client";

import { useState } from "react";
import type { ActorsPageData } from "@/lib/actors-page";
import { ActorsRegistry } from "./ActorsRegistry";
import { FilterPills, type TierFilterValue } from "./FilterPills";
import { PageTopbar } from "./PageTopbar";

interface ActorsPageContentProps {
  data: ActorsPageData;
}

export function ActorsPageContent({ data }: ActorsPageContentProps) {
  const [tierFilter, setTierFilter] = useState<TierFilterValue>("all");

  return (
    <>
      <PageTopbar
        title="Actors"
        subtitle="Tracked actor registry: tier, role, geography, and lifecycle status."
        filters={
          <FilterPills
            variant="actors"
            value={tierFilter}
            onChange={setTierFilter}
          />
        }
      />
      <div className="radar-content">
        {data.tiers.length === 0 ? (
          <p className="radar-empty">
            No actors seeded yet. Run POST /api/seed to load the domain registry.
          </p>
        ) : (
          <ActorsRegistry data={data} tierFilter={tierFilter} />
        )}
      </div>
    </>
  );
}
