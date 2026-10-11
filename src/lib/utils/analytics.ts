import type { Category, Task } from "@/types/database";
import { dayKey, elapsedSeconds } from "@/lib/utils/time";

export type TaskPhase = "not_started" | "in_progress" | "done" | "skipped";

/**
 * Where a task stands right now, independent of its stored `status` field
 * for the time-based cases: a scheduled task whose window hasn't arrived yet
 * reads as "not started", one whose window has started (or a live timer)
 * reads as "in progress", and only an explicit done/skip ever changes that.
 */
export function getTaskPhase(task: Task, now: Date = new Date()): TaskPhase {
  if (task.status === "done") return "done";
  if (task.status === "skipped") return "skipped";
  if (task.is_running) return "in_progress";
  return now < new Date(task.start_time) ? "not_started" : "in_progress";
}

/**
 * Effective tracked seconds for a task *as of `now`* — a scheduled task that
 * hasn't started yet contributes 0, one that's currently underway
 * contributes only the time elapsed so far (not its full planned duration),
 * and a finished/done/skipped task contributes its full logged duration.
 */
export function taskSeconds(task: Task, now: Date = new Date()): number {
  if (task.is_running) return elapsedSeconds(task.start_time);

  const start = new Date(task.start_time);
  const stillPending = task.status !== "done" && task.status !== "skipped";

  if (stillPending && now < start) return 0; // scheduled, hasn't started yet

  const end = task.end_time ? new Date(task.end_time) : null;
  if (stillPending && end && now < end) {
    // Underway right now — only count what's actually elapsed so far.
    return Math.max(0, (now.getTime() - start.getTime()) / 1000);
  }

  if (task.duration_seconds != null) return task.duration_seconds;
  if (end) return Math.max(0, (end.getTime() - start.getTime()) / 1000);
  return 0;
}

/** Total tracked seconds per calendar day (local time), keyed by "YYYY-MM-DD". */
export function buildDailyTotals(tasks: Task[], now: Date = new Date()): Map<string, number> {
  const map = new Map<string, number>();
  for (const task of tasks) {
    const key = dayKey(task.start_time);
    map.set(key, (map.get(key) ?? 0) + taskSeconds(task, now));
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
export function buildCategoryTotals(
  tasks: Task[],
  categories: Category[],
  now: Date = new Date()
): CategoryTotal[] {
  const totals = new Map<string, number>();
  for (const task of tasks) {
    const key = task.category_id ?? "uncategorized";
    totals.set(key, (totals.get(key) ?? 0) + taskSeconds(task, now));
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
export function weekdayAverages(
  tasks: Task[],
  now: Date = new Date()
): { weekday: string; avgSeconds: number }[] {
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
    totals[date.getDay()] += taskSeconds(task, now);
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
