import type { LivingDocumentSignal } from "@/lib/living-document";
import { SignalItem } from "./SignalItem";

interface WorthWatchingSectionProps {
  signals: LivingDocumentSignal[];
}

export function WorthWatchingSection({ signals }: WorthWatchingSectionProps) {
  if (signals.length === 0) {
    return null;
  }

  return (
    <section id="worth-watching" className="radar-worth-watching">
      <h2 className="radar-worth-watching-label">
        Worth Watching — Signals from beyond the radar
      </h2>
      <div className="radar-worth-watching-list">
        {signals.map((signal) => (
          <SignalItem key={signal.id} signal={signal} />
        ))}
      </div>
    </section>
  );
}
