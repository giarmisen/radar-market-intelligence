import { defaultEdgarDateRange } from "./edgar";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface IngestDateRange {
  fromDate: string;
  toDate: string;
}

export function parseIngestDateRange(
  from?: string | null,
  to?: string | null,
  lookbackDays = 7,
): IngestDateRange {
  const defaults = defaultEdgarDateRange(lookbackDays);
  const fromDate = from?.trim() || defaults.startDate;
  const toDate = to?.trim() || defaults.endDate;

  if (!ISO_DATE_RE.test(fromDate) || !ISO_DATE_RE.test(toDate)) {
    throw new Error("from and to must be YYYY-MM-DD");
  }

  if (fromDate > toDate) {
    throw new Error("from must be on or before to");
  }

  return { fromDate, toDate };
}
