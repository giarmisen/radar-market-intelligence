import { todayIsoDate } from "./ingest/date-range";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface QuarterlyReviewMeta {
  domain: string;
  domain_name: string;
  from: string;
  to: string;
  signal_count: number;
  generated_at: string;
}

export function isoDateDaysAgo(days: number): string {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  return since.toISOString().slice(0, 10);
}

export function defaultReportDateRange(): { from: string; to: string } {
  return {
    from: isoDateDaysAgo(90),
    to: todayIsoDate(),
  };
}

export function parseReportDateRange(
  from?: string | null,
  to?: string | null,
): { from: string; to: string } {
  const defaults = defaultReportDateRange();
  const fromDate = from?.trim() || defaults.from;
  const toDate = to?.trim() || defaults.to;

  if (!ISO_DATE_RE.test(fromDate) || !ISO_DATE_RE.test(toDate)) {
    throw new Error("from and to must be YYYY-MM-DD");
  }

  if (fromDate > toDate) {
    throw new Error("from must be on or before to");
  }

  return { from: fromDate, to: toDate };
}
