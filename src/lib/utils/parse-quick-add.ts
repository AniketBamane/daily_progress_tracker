import * as chrono from "chrono-node";

export interface QuickAddCategory {
  id: string;
  name: string;
}

export interface ParsedQuickAdd {
  /** The cleaned-up task name with time/category/priority tokens stripped out. */
  name: string;
  categoryId: string | null;
  startTime: Date;
  endTime: Date | null;
  durationSeconds: number | null;
  priority: "low" | "medium" | "high";
  /** True if the user typed any recognizable time/duration — false means "start now". */
  hasExplicitTime: boolean;
}

/**
 * Parses free-text quick-add input into a structured task, the way a human
 * would read it. Supports things like:
 *   "Gym 7-8am #health"      -> name: Gym, 7:00-8:00am, category: Health
 *   "Write report 2h"        -> name: Write report, starts now, 2h duration
 *   "Call mom tomorrow 5pm"  -> name: Call mom, tomorrow 5:00pm
 *   "Deep work #work 90m !!" -> name: Deep work, category: Work, 90m, high priority
 *
 * Nothing here is required to be present — if parsing finds no time/category,
 * the whole input just becomes the task name, starting now.
 */
export function parseQuickAdd(
  input: string,
  categories: QuickAddCategory[] = [],
  now: Date = new Date()
): ParsedQuickAdd {
  let text = input.trim();

  // --- Priority shorthand: "!!" = high, "!low" = low, "!high" = high ---
  let priority: "low" | "medium" | "high" = "medium";
  if (/(^|\s)!!(\s|$)/.test(text)) {
    priority = "high";
    text = text.replace(/(^|\s)!!(\s|$)/, " ").trim();
  } else if (/(^|\s)!low\b/i.test(text)) {
    priority = "low";
    text = text.replace(/(^|\s)!low\b/i, " ").trim();
  } else if (/(^|\s)!high\b/i.test(text)) {
    priority = "high";
    text = text.replace(/(^|\s)!high\b/i, " ").trim();
  }

  // --- Category hashtag: "#health" matches a category by name ---
  let categoryId: string | null = null;
  const hashtagMatch = text.match(/#([a-zA-Z0-9_-]+)/);
  if (hashtagMatch) {
    const tag = hashtagMatch[1].toLowerCase();
    const found = categories.find(
      (c) => c.name.toLowerCase() === tag || c.name.toLowerCase().startsWith(tag)
    );
    if (found) categoryId = found.id;
    text = text.replace(hashtagMatch[0], " ").trim();
  }

  // --- Duration shorthand: "2h", "90m", "1h30m" ---
  let durationSeconds: number | null = null;
  const combined = text.match(/\b(\d+)\s*h(?:ours?|rs?|r)?\s*(\d+)\s*m(?:in(?:utes?)?)?\b/i);
  const hoursOnly = text.match(/\b(\d+(?:\.\d+)?)\s*h(?:ours?|rs?|r)?\b/i);
  const minutesOnly = text.match(/\b(\d+)\s*m(?:in(?:utes?)?)?\b/i);

  if (combined) {
    durationSeconds = (parseInt(combined[1], 10) * 60 + parseInt(combined[2], 10)) * 60;
    text = text.replace(combined[0], " ").trim();
  } else if (hoursOnly) {
    durationSeconds = parseFloat(hoursOnly[1]) * 3600;
    text = text.replace(hoursOnly[0], " ").trim();
  } else if (minutesOnly) {
    durationSeconds = parseInt(minutesOnly[1], 10) * 60;
    text = text.replace(minutesOnly[0], " ").trim();
  }

  // --- Date/time, e.g. "7-8am", "tomorrow 5pm", "9:30" ---
  const results = chrono.parse(text, now, { forwardDate: false });
  let startTime = now;
  let endTime: Date | null = null;

  if (results.length > 0) {
    const result = results[0];
    startTime = result.start.date();
    if (result.end) {
      endTime = result.end.date();
    }
    text = (text.slice(0, result.index) + " " + text.slice(result.index + result.text.length)).trim();
  }

  if (!endTime && durationSeconds) {
    endTime = new Date(startTime.getTime() + durationSeconds * 1000);
  }

  // Clean up leftover whitespace/punctuation left behind by removed tokens
  const name = text
    .replace(/\s{2,}/g, " ")
    .replace(/^[-,:\s]+|[-,:\s]+$/g, "")
    .trim();

  return {
    name: name || "Untitled task",
    categoryId,
    startTime,
    endTime,
    durationSeconds,
    priority,
    hasExplicitTime: results.length > 0 || durationSeconds !== null,
  };
}
