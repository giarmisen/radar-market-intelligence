import { defaultEdgarDateRange } from "./edgar";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Default cron window for RSS (timestamp) and Gmail (search + post-filter). */
export const DEFAULT_INGEST_LOOKBACK_HOURS = 48;

export interface IngestDateRange {
  fromDate: string;
  toDate: string;
  /** True when the caller supplied ?from= and/or ?to= (manual backfill). */
  explicit: boolean;
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isoDateHoursAgo(hours: number): string {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  return since.toISOString().slice(0, 10);
}

export function ingestSinceTimestamp(
  hours = DEFAULT_INGEST_LOOKBACK_HOURS,
): number {
  return Date.now() - hours * 60 * 60 * 1000;
}

/** Gmail `after:` for cron — calendar yesterday (slack for late cron runs). */
export function defaultGmailAfterDate(): string {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return yesterday.toISOString().slice(0, 10);
}

export function parseIngestDateRange(
  from?: string | null,
  to?: string | null,
): IngestDateRange {
  const hasFrom = Boolean(from?.trim());
  const hasTo = Boolean(to?.trim());
  const explicit = hasFrom || hasTo;

  if (!explicit) {
    return {
      fromDate: isoDateHoursAgo(DEFAULT_INGEST_LOOKBACK_HOURS),
      toDate: todayIsoDate(),
      explicit: false,
    };
  }

  const backfillDefaults = defaultEdgarDateRange(7);
  const fromDate = from?.trim() || backfillDefaults.startDate;
  const toDate = to?.trim() || todayIsoDate();

  if (!ISO_DATE_RE.test(fromDate) || !ISO_DATE_RE.test(toDate)) {
    throw new Error("from and to must be YYYY-MM-DD");
  }

  if (fromDate > toDate) {
    throw new Error("from must be on or before to");
  }

  return { fromDate, toDate, explicit: true };
}
