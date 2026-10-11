import type { Category, Task } from "@/types/database";
import { dayKey, elapsedSeconds } from "@/lib/utils/time";

/** Effective duration of a task in seconds, whether finished, running, or just logged. */
export function taskSeconds(task: Task): number {
  if (task.duration_seconds) return task.duration_seconds;
  if (task.end_time) {
    return Math.max(0, (new Date(task.end_time).getTime() - new Date(task.start_time).getTime()) / 1000);
  }
  if (task.is_running) return elapsedSeconds(task.start_time);
  return 0;
}

/** Total tracked seconds per calendar day (local time), keyed by "YYYY-MM-DD". */
export function buildDailyTotals(tasks: Task[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const task of tasks) {
    const key = dayKey(task.start_time);
    map.set(key, (map.get(key) ?? 0) + taskSeconds(task));
  }
  return map;
}

export interface CategoryTotal {
  id: string;
  name: string;
  color: string;
  seconds: number;
}

/** Total tracked seconds per category, sorted descending, uncategorized last. */
export function buildCategoryTotals(tasks: Task[], categories: Category[]): CategoryTotal[] {
  const totals = new Map<string, number>();
  for (const task of tasks) {
    const key = task.category_id ?? "uncategorized";
    totals.set(key, (totals.get(key) ?? 0) + taskSeconds(task));
  }

  const rows: CategoryTotal[] = categories
    .map((c) => ({ id: c.id, name: c.name, color: c.color, seconds: totals.get(c.id) ?? 0 }))
    .filter((c) => c.seconds > 0);

  const uncategorized = totals.get("uncategorized") ?? 0;
  if (uncategorized > 0) {
    rows.push({ id: "uncategorized", name: "Uncategorized", color: "#94a3b8", seconds: uncategorized });
  }

  return rows.sort((a, b) => b.seconds - a.seconds);
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Average tracked seconds per weekday across all weeks present in the data. */
export function weekdayAverages(tasks: Task[]): { weekday: string; avgSeconds: number }[] {
  const totals = new Array(7).fill(0);
  const daysSeen = new Array(7).fill(0) as number[];
  const seenDates = new Set<string>();

  for (const task of tasks) {
    const date = new Date(task.start_time);
    const key = dayKey(date);
    if (!seenDates.has(key)) {
      seenDates.add(key);
      daysSeen[date.getDay()]++;
    }
    totals[date.getDay()] += taskSeconds(task);
  }

  return WEEKDAY_LABELS.map((label, i) => ({
    weekday: label,
    avgSeconds: daysSeen[i] > 0 ? totals[i] / daysSeen[i] : 0,
  }));
}

/** Percent change between two totals, or null if there's no baseline to compare against. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? null : 0;
  return Math.round(((current - previous) / previous) * 100);
}
