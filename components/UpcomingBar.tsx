import type { UpcomingEvent } from "@/lib/living-document";
import { formatDate } from "@/lib/format";

interface UpcomingBarProps {
  events: UpcomingEvent[];
}

export function UpcomingBar({ events }: UpcomingBarProps) {
  if (events.length === 0) {
    return null;
  }

  return (
    <section className="radar-upcoming" aria-label="Upcoming events">
      <span className="radar-upcoming-label">Upcoming</span>
      {events.map((event) => (
        <div key={event.id} className="radar-upcoming-pill">
          <span className="radar-upcoming-date">
            {formatDate(event.scheduled_date)}
          </span>
          <span>{event.title}</span>
        </div>
      ))}
    </section>
  );
}
