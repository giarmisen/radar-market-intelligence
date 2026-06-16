import type { ActorCard as ActorCardData } from "@/lib/living-document";
import { formatDate, formatRole } from "@/lib/format";
import { SignalItem } from "./SignalItem";

interface ActorCardProps {
  actor: ActorCardData;
}

export function ActorCard({ actor }: ActorCardProps) {
  const geography =
    actor.geography && actor.geography.length > 0
      ? actor.geography.join(", ")
      : null;

  return (
    <article className="radar-card">
      <header className="radar-card-header">
        <h2 className="radar-card-name">{actor.name}</h2>
        <div className="radar-card-meta">
          <span
            className={`radar-tier-badge${actor.tier === 2 ? " radar-tier-badge-2" : ""}`}
          >
            Tier {actor.tier}
          </span>
          <span>{formatRole(actor.role)}</span>
          {geography ? <span>{geography}</span> : null}
        </div>
      </header>

      <div className="radar-card-signals">
        {actor.signals.map((signal) => (
          <SignalItem key={signal.id} signal={signal} />
        ))}
      </div>

      {actor.lastSignalDate ? (
        <footer className="radar-card-footer">
          Last signal {formatDate(actor.lastSignalDate)}
        </footer>
      ) : null}
    </article>
  );
}
