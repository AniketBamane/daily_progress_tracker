/** Formats a duration in seconds as "1h 23m", "45m", or "32s". */
export function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${Math.max(0, Math.round(totalSeconds))}s`;

  const totalMinutes = Math.round(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/** Formats minutes as "1h 23m" / "45m" — convenience wrapper for goal targets. */
export function formatMinutes(totalMinutes: number): string {
  return formatDuration(totalMinutes * 60);
}

/** Formats a Date/ISO string as a short clock time, e.g. "9:30 AM". */
export function formatClockTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** Live-elapsed seconds between a start time and now. */
export function elapsedSeconds(startTime: string | Date): number {
  const start = typeof startTime === "string" ? new Date(startTime) : startTime;
  return Math.max(0, (Date.now() - start.getTime()) / 1000);
}

/** Returns the start/end of "today" in the user's local timezone, as ISO strings. */
export function todayRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

/** Returns an ISO range covering the last N days, including today. */
export function lastNDaysRange(n: number): { start: string; end: string } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const start = new Date(end);
  start.setDate(start.getDate() - n);
  return { start: start.toISOString(), end: end.toISOString() };
}

/** Returns an ISO range covering the current calendar year. */
export function yearRange(year: number): { start: string; end: string } {
  return {
    start: new Date(year, 0, 1).toISOString(),
    end: new Date(year + 1, 0, 1).toISOString(),
  };
}

/** YYYY-MM-DD key in local time, used for grouping tasks by day. */
export function dayKey(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Counts consecutive active days ending today. If today has no activity yet,
 * counting starts from yesterday so the streak isn't zeroed out before the
 * day is over.
 */
export function calculateStreak(activeDayKeys: Set<string>, now: Date = new Date()): number {
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (!activeDayKeys.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (activeDayKeys.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
