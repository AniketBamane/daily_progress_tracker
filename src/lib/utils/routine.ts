/** Weekdays in display order (Mon first). `value` matches JS getDay(): 0 = Sunday. */
export const WEEKDAYS = [
  { value: 1, short: "Mon", long: "Monday", letter: "M" },
  { value: 2, short: "Tue", long: "Tuesday", letter: "T" },
  { value: 3, short: "Wed", long: "Wednesday", letter: "W" },
  { value: 4, short: "Thu", long: "Thursday", letter: "T" },
  { value: 5, short: "Fri", long: "Friday", letter: "F" },
  { value: 6, short: "Sat", long: "Saturday", letter: "S" },
  { value: 0, short: "Sun", long: "Sunday", letter: "S" },
] as const;

export const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
export const WEEKDAYS_ONLY = [1, 2, 3, 4, 5];
export const WEEKENDS_ONLY = [0, 6];

function sameDays(a: number[], b: number[]) {
  return a.length === b.length && b.every((d) => a.includes(d));
}

/** "Every day", "Weekdays", "Weekends", or e.g. "Mon, Wed, Fri". */
export function summarizeDays(days: number[]): string {
  if (sameDays(days, EVERY_DAY)) return "Every day";
  if (sameDays(days, WEEKDAYS_ONLY)) return "Weekdays";
  if (sameDays(days, WEEKENDS_ONLY)) return "Weekends";
  return WEEKDAYS.filter((d) => days.includes(d.value))
    .map((d) => d.short)
    .join(", ");
}

/** Minutes since midnight → "7:30 AM". */
export function formatMinuteOfDay(minute: number): string {
  const m = ((minute % 1440) + 1440) % 1440;
  const date = new Date(2000, 0, 1, Math.floor(m / 60), m % 60);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** Minutes since midnight → "07:30" (value for <input type="time">). */
export function minuteToInput(minute: number): string {
  const m = ((minute % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** "07:30" → 450. Returns null for empty/invalid input. */
export function inputToMinute(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}
