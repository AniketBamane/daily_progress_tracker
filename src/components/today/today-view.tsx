"use client";

import { useMemo } from "react";
import { CheckCircle2, Clock, Flame, ListTodo } from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { QuickAddBar } from "@/components/quick-add/quick-add-bar";
import { TaskList } from "@/components/tasks/task-list";
import { useTasksContext } from "@/contexts/tasks-context";
import { useNow } from "@/hooks/use-now";
import { formatDuration } from "@/lib/utils/time";
import { taskSeconds } from "@/lib/utils/analytics";

export function TodayView({ streak }: { streak: number }) {
  const { tasks } = useTasksContext();
  const now = useNow();

  const stats = useMemo(() => {
    // Only counts time that has actually elapsed — a task scheduled later
    // today contributes 0 until its window arrives.
    const totalSeconds = tasks.reduce((sum, t) => sum + taskSeconds(t, now), 0);

    const done = tasks.filter((t) => t.status === "done").length;
    const total = tasks.length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

    return { totalSeconds, done, total, completionRate };
  }, [tasks, now]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <p className="text-sm text-muted-foreground">{today}</p>
      </div>

      <div className="sm:hidden">
        <QuickAddBar />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Time tracked"
          value={formatDuration(stats.totalSeconds)}
          icon={Clock}
          accent="#6366f1"
        />
        <KpiCard
          label="Completed"
          value={`${stats.done}/${stats.total}`}
          sublabel={`${stats.completionRate}%`}
          icon={CheckCircle2}
          accent="#22c55e"
        />
        <KpiCard label="Tasks logged" value={String(stats.total)} icon={ListTodo} accent="#f59e0b" />
        <KpiCard
          label="Day streak"
          value={String(streak)}
          sublabel={streak === 1 ? "day" : "days"}
          icon={Flame}
          accent="#ef4444"
        />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Timeline</h2>
        <TaskList tasks={tasks} />
      </div>
    </div>
  );
}
