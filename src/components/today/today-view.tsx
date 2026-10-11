"use client";

import { useMemo } from "react";
import { CheckCircle2, Clock, Flame, ListTodo } from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { QuickAddBar } from "@/components/quick-add/quick-add-bar";
import { TaskList } from "@/components/tasks/task-list";
import { useTasksContext } from "@/contexts/tasks-context";
import { elapsedSeconds, formatDuration } from "@/lib/utils/time";

export function TodayView({ streak }: { streak: number }) {
  const { tasks } = useTasksContext();

  const stats = useMemo(() => {
    const totalSeconds = tasks.reduce((sum, t) => {
      if (t.duration_seconds) return sum + t.duration_seconds;
      if (t.is_running) return sum + elapsedSeconds(t.start_time);
      if (t.end_time) {
        return sum + (new Date(t.end_time).getTime() - new Date(t.start_time).getTime()) / 1000;
      }
      return sum;
    }, 0);

    const done = tasks.filter((t) => t.status === "done").length;
    const total = tasks.length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

    return { totalSeconds, done, total, completionRate };
  }, [tasks]);

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
