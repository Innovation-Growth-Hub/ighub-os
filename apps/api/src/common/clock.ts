import { TIMEZONE } from "@ighub/shared";

/** Today's date (YYYY-MM-DD) in Africa/Lagos. Business rules never trust the client's clock. */
export function lagosToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
