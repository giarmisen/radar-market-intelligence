"use client";

import type { UpcomingEvent } from "@/lib/living-document";
import {
  resolveUpcomingPillTarget,
  scrollToSignal,
} from "@/lib/pulse-navigation";
import { formatDate } from "@/lib/format";

interface UpcomingBarProps {
  events: UpcomingEvent[];
  pulseSignalIds: Set<string>;
}

export function UpcomingBar({ events, pulseSignalIds }: UpcomingBarProps) {
  if (events.length === 0) {
    return null;
  }

  return (
    <section className="radar-pulse-summary-section" aria-label="Upcoming events">
      <h2 className="radar-section-label text-section-label">Upcoming</h2>
      <div className="radar-pulse-pills">
        {events.map((event) => {
          const target = resolveUpcomingPillTarget(event.id, pulseSignalIds);

          if (target.kind === "static") {
            return (
              <span key={event.id} className="radar-pulse-pill radar-pulse-pill-static">
                <span className="radar-pulse-pill-emphasis">
                  {formatDate(event.scheduled_date)}
                </span>
                <span className="radar-pulse-pill-body">{event.title}</span>
              </span>
            );
          }

          return (
            <a
              key={event.id}
              href={target.href}
              className="radar-pulse-pill"
              onClick={(eventClick) => {
                if (target.kind !== "pulse") {
                  return;
                }
                eventClick.preventDefault();
                scrollToSignal(event.id);
              }}
            >
              <span className="radar-pulse-pill-emphasis">
                {formatDate(event.scheduled_date)}
              </span>
              <span className="radar-pulse-pill-body">{event.title}</span>
            </a>
          );
        })}
      </div>
    </section>
  );
}
