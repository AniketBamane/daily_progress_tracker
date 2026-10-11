"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { parseQuickAdd } from "@/lib/utils/parse-quick-add";
import { formatClockTime, formatDuration } from "@/lib/utils/time";
import { useTasksContext } from "@/contexts/tasks-context";
import { useCategoriesContext } from "@/contexts/categories-context";
import { cn } from "@/lib/utils";

interface QuickAddBarProps {
  className?: string;
  autoFocus?: boolean;
  onAdded?: () => void;
}

export function QuickAddBar({ className, autoFocus, onAdded }: QuickAddBarProps) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { tasks, addTask, stopRunningTask } = useTasksContext();
  const { categories } = useCategoriesContext();

  // Global shortcut: press "n" (outside of inputs) or Cmd/Ctrl+K to jump to quick-add.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isTyping = ["INPUT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable;

      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key.toLowerCase() === "n" && !isTyping)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const categoryRefs = useMemo(
    () => categories.map((c) => ({ id: c.id, name: c.name })),
    [categories]
  );

  const parsed = useMemo(() => {
    if (!text.trim()) return null;
    return parseQuickAdd(text, categoryRefs);
  }, [text, categoryRefs]);

  const recentChips = useMemo(() => {
    const seen = new Map<string, { name: string; categoryId: string | null }>();
    for (const t of tasks) {
      if (!seen.has(t.name.toLowerCase())) {
        seen.set(t.name.toLowerCase(), { name: t.name, categoryId: t.category_id });
      }
      if (seen.size >= 5) break;
    }
    return Array.from(seen.values());
  }, [tasks]);

  async function submit(overrideText?: string) {
    const raw = (overrideText ?? text).trim();
    if (!raw || submitting) return;

    const result = parseQuickAdd(raw, categoryRefs);
    setSubmitting(true);

    try {
      // Only one timer runs at a time — starting a new one stops whatever was running.
      if (!result.hasExplicitTime) {
        await stopRunningTask(result.startTime);
      }

      await addTask({
        name: result.name,
        category_id: result.categoryId,
        start_time: result.startTime.toISOString(),
        end_time: result.endTime ? result.endTime.toISOString() : null,
        duration_seconds: result.durationSeconds,
        priority: result.priority,
        status: result.endTime ? "done" : "in_progress",
        is_running: !result.hasExplicitTime,
      });

      toast.success(
        result.hasExplicitTime ? `Logged "${result.name}"` : `Started "${result.name}"`
      );
      setText("");
      onAdded?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add that task");
    } finally {
      setSubmitting(false);
    }
  }

  const categoryMatch = parsed?.categoryId
    ? categories.find((c) => c.id === parsed.categoryId)
    : null;

  return (
    <div className={cn("w-full space-y-2", className)}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <Sparkles className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            autoFocus={autoFocus}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='Try "Gym 7-8am #health" or "Deep work 90m" — or just a name to start now'
            className="h-11 pl-9 text-[15px]"
            disabled={submitting}
          />
        </div>
        <Button type="submit" size="lg" className="h-11 px-4" disabled={submitting || !text.trim()}>
          {submitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          <span className="hidden sm:inline">
            {parsed?.hasExplicitTime ? "Log" : "Start"}
          </span>
        </Button>
      </form>

      {parsed && (
        <div className="flex flex-wrap items-center gap-1.5 px-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{parsed.name}</span>
          {parsed.hasExplicitTime ? (
            <span>
              · {formatClockTime(parsed.startTime)}
              {parsed.endTime ? ` – ${formatClockTime(parsed.endTime)}` : ""}
              {parsed.durationSeconds ? ` (${formatDuration(parsed.durationSeconds)})` : ""}
            </span>
          ) : (
            <span>· starts now, timer running</span>
          )}
          {categoryMatch && (
            <Badge
              variant="outline"
              className="h-5 gap-1 px-1.5"
              style={{ borderColor: categoryMatch.color, color: categoryMatch.color }}
            >
              <span className="size-1.5 rounded-full" style={{ backgroundColor: categoryMatch.color }} />
              {categoryMatch.name}
            </Badge>
          )}
          {parsed.priority !== "medium" && (
            <Badge variant="secondary" className="h-5 px-1.5 capitalize">
              {parsed.priority}
            </Badge>
          )}
        </div>
      )}

      {!text && recentChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {recentChips.map((chip) => (
            <button
              key={chip.name}
              type="button"
              onClick={() => submit(chip.name)}
              disabled={submitting}
              className="rounded-full border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground transition hover:border-foreground/30 hover:text-foreground disabled:opacity-50"
            >
              {chip.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
