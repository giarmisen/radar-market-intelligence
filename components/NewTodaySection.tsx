import type { LivingDocumentSignal } from "@/lib/living-document";
import { SignalItem } from "./SignalItem";

interface NewTodaySectionProps {
  signals: LivingDocumentSignal[];
}

export function NewTodaySection({ signals }: NewTodaySectionProps) {
  if (signals.length === 0) {
    return null;
  }

  return (
    <section
      id="new-today"
      className="radar-pulse-summary-section"
      aria-label="New today"
    >
      <h2 className="radar-section-label radar-pulse-summary-label text-section-label">
        New today
      </h2>
      <div className="radar-card-signals">
        {signals.map((signal) => (
          <SignalItem key={signal.id} signal={signal} showNewBadge={false} />
        ))}
      </div>
    </section>
  );
}
