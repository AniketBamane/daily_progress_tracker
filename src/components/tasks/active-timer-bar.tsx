"use client";

import { useEffect, useReducer } from "react";
import { Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTasksContext } from "@/contexts/tasks-context";
import { useCategoriesContext } from "@/contexts/categories-context";
import { elapsedSeconds, formatDuration } from "@/lib/utils/time";
import { cn } from "@/lib/utils";

export function ActiveTimerBar({ className }: { className?: string }) {
  const { tasks, stopRunningTask } = useTasksContext();
  const { categories } = useCategoriesContext();
  const running = tasks.find((t) => t.is_running);

  // Ticks once a second purely to force a re-render; the elapsed time itself
  // is derived fresh from `running.start_time` on every render, never stored.
  const [, tick] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [running]);

  if (!running) return null;

  const elapsed = elapsedSeconds(running.start_time);
  const category = categories.find((c) => c.id === running.category_id);

  async function handleStop() {
    try {
      await stopRunningTask();
      toast.success(`Stopped "${running!.name}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't stop the timer");
    }
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-full border bg-card px-3 py-1.5 shadow-sm",
        className
      )}
    >
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </span>
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm font-medium">{running.name}</span>
        {category && (
          <span className="text-[11px] text-muted-foreground">{category.name}</span>
        )}
      </div>
      <span className="font-mono text-sm tabular-nums text-muted-foreground">
        {formatDuration(elapsed)}
      </span>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="size-7 shrink-0 rounded-full text-destructive hover:text-destructive"
        onClick={handleStop}
        aria-label="Stop timer"
      >
        <Square className="size-3.5 fill-current" />
      </Button>
    </div>
  );
}
