"use client";

import { useState } from "react";
import { motion, useMotionValue, useTransform, animate, type PanInfo } from "framer-motion";
import { Check, Trash2, Circle, CheckCircle2, XCircle, MoreVertical, Repeat } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTasksContext } from "@/contexts/tasks-context";
import { useCategoriesContext } from "@/contexts/categories-context";
import { createClient } from "@/lib/supabase/client";
import { useNow } from "@/hooks/use-now";
import { formatClockTime, formatDuration } from "@/lib/utils/time";
import { getTaskPhase, taskSeconds } from "@/lib/utils/analytics";
import type { Task } from "@/types/database";
import { cn } from "@/lib/utils";

const SWIPE_THRESHOLD = 72;

export function TaskItem({ task }: { task: Task }) {
  const { updateTask, deleteTask, stopRunningTask } = useTasksContext();
  const { categories } = useCategoriesContext();
  const x = useMotionValue(0);
  // Hint text is fully transparent at rest and only fades in as you drag
  // toward the threshold, so it can never show up (or misrender) at rest.
  const doneOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const deleteOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
  const [dragging, setDragging] = useState(false);
  const now = useNow();

  const category = categories.find((c) => c.id === task.category_id) ?? null;
  const phase = getTaskPhase(task, now);
  const duration = taskSeconds(task, now) || null;

  async function markDone() {
    if (task.is_running) {
      await stopRunningTask();
      return;
    }
    await updateTask(task.id, { status: "done" });
    toast.success("Marked as done");
  }

  async function remove() {
    const removed = await deleteTask(task.id);
    if (removed) {
      toast("Task deleted", {
        action: {
          label: "Undo",
          onClick: async () => {
            await createClient().from("tasks").insert({
              user_id: removed.user_id,
              category_id: removed.category_id,
              routine_id: removed.routine_id,
              name: removed.name,
              notes: removed.notes,
              start_time: removed.start_time,
              end_time: removed.end_time,
              duration_seconds: removed.duration_seconds,
              status: removed.status,
              priority: removed.priority,
              is_running: removed.is_running,
            });
          },
        },
      });
    }
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    setDragging(false);
    if (info.offset.x > SWIPE_THRESHOLD) {
      animate(x, 0);
      markDone();
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      animate(x, -400, { duration: 0.15 });
      remove();
    } else {
      animate(x, 0);
    }
  }

  const statusIcon =
    phase === "done" ? (
      <CheckCircle2 className="size-4 text-emerald-500" />
    ) : phase === "skipped" ? (
      <XCircle className="size-4 text-muted-foreground" />
    ) : phase === "in_progress" ? (
      <span className="relative flex size-4 items-center justify-center">
        <span className="absolute inline-flex size-2.5 animate-ping rounded-full bg-emerald-500 opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </span>
    ) : (
      <Circle className="size-4 text-muted-foreground" />
    );

  const phaseLabel =
    phase === "not_started" ? "Not started" : phase === "in_progress" ? "In progress" : null;

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Swipe-reveal background actions (mobile) — invisible at rest, fades
          in only as you actually drag, so it can never show up unprompted. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-5 md:hidden">
        <motion.div style={{ opacity: doneOpacity }} className="flex items-center gap-1.5 text-emerald-600">
          <Check className="size-5" />
          <span className="text-sm font-medium">Done</span>
        </motion.div>
        <motion.div style={{ opacity: deleteOpacity }} className="flex items-center gap-1.5 text-destructive">
          <span className="text-sm font-medium">Delete</span>
          <Trash2 className="size-5" />
        </motion.div>
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.6}
        style={{ x }}
        onDragStart={() => setDragging(true)}
        onDragEnd={handleDragEnd}
        className={cn(
          "relative flex items-center gap-3 rounded-xl border bg-card px-3 py-3 md:cursor-default",
          task.status === "done" && "opacity-70",
          dragging && "cursor-grabbing shadow-lg"
        )}
      >
        <button
          type="button"
          onClick={markDone}
          disabled={task.status === "done"}
          className="shrink-0 disabled:cursor-default"
          aria-label="Toggle done"
        >
          {statusIcon}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={cn("truncate text-sm font-medium", task.status === "done" && "line-through")}>
              {task.name}
            </p>
            {task.priority === "high" && (
              <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                High
              </Badge>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span>{formatClockTime(task.start_time)}</span>
            {task.routine_id && (
              <span className="inline-flex items-center" title="From your routine" aria-label="From your routine">
                <Repeat className="size-3" />
              </span>
            )}
            {duration !== null && <span>· {formatDuration(duration)}</span>}
            {category && (
              <span className="inline-flex items-center gap-1">
                <span className="size-1.5 rounded-full" style={{ backgroundColor: category.color }} />
                {category.name}
              </span>
            )}
            {phaseLabel && (
              <span className={cn(phase === "in_progress" && "font-medium text-emerald-600 dark:text-emerald-500")}>
                · {phaseLabel}
              </span>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="hidden shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted md:block"
                aria-label="Task options"
              />
            }
          >
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={markDone}>Mark done</DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateTask(task.id, { status: "skipped" })}>
              Skip
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={remove}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>
    </div>
  );
}
