"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ClipboardList } from "lucide-react";
import { TaskItem } from "@/components/tasks/task-item";
import type { Task } from "@/types/database";

export function TaskList({ tasks, emptyHint }: { tasks: Task[]; emptyHint?: string }) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-14 text-center">
        <ClipboardList className="size-8 text-muted-foreground" />
        <p className="text-sm font-medium">Nothing logged yet</p>
        <p className="max-w-[220px] text-xs text-muted-foreground">
          {emptyHint ?? 'Type above and hit Start — try "Gym 30m" or just a task name.'}
        </p>
      </div>
    );
  }

  const sorted = [...tasks].sort(
    (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
  );

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {sorted.map((task) => (
          <motion.div
            key={task.id}
            layout
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.18 }}
          >
            <TaskItem task={task} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
