"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useCategoriesContext } from "@/contexts/categories-context";
import { dayKey, formatClockTime, formatDuration, elapsedSeconds } from "@/lib/utils/time";
import type { Task } from "@/types/database";
import { cn } from "@/lib/utils";

function startOfWeek(offset: number) {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
  monday.setDate(monday.getDate() + offset * 7);
  return monday;
}

function taskDuration(task: Task) {
  if (task.duration_seconds) return task.duration_seconds;
  if (task.is_running) return elapsedSeconds(task.start_time);
  if (task.end_time) {
    return (new Date(task.end_time).getTime() - new Date(task.start_time).getTime()) / 1000;
  }
  return 0;
}

export function CalendarView({ userId }: { userId: string }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [supabase] = useState(() => createClient());
  const { categories } = useCategoriesContext();

  const weekStart = useMemo(() => startOfWeek(weekOffset), [weekOffset]);
  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    return d;
  }, [weekStart]);

  useEffect(() => {
    let cancelled = false;
    // Standard "loading flag for an in-flight effect fetch" pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .gte("start_time", weekStart.toISOString())
      .lt("start_time", weekEnd.toISOString())
      .order("start_time", { ascending: true })
      .then(({ data }) => {
        if (!cancelled) {
          setTasks(data ?? []);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, userId, weekStart, weekEnd]);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const key = dayKey(date);
      const dayTasks = tasks.filter((t) => dayKey(t.start_time) === key);
      const totalSeconds = dayTasks.reduce((sum, t) => sum + taskDuration(t), 0);
      return { date, key, tasks: dayTasks, totalSeconds };
    });
  }, [weekStart, tasks]);

  const weekTotal = days.reduce((sum, d) => sum + d.totalSeconds, 0);
  const todayKey = dayKey(new Date());
  const selected = days.find((d) => d.key === selectedDay) ?? null;

  const rangeLabel = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(
    weekEnd.getTime() - 86400000
  ).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">
            {rangeLabel} · {formatDuration(weekTotal)} tracked
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => setWeekOffset((o) => o - 1)} aria-label="Previous week">
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>
            This week
          </Button>
          <Button variant="outline" size="icon" onClick={() => setWeekOffset((o) => o + 1)} aria-label="Next week">
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
        {days.map((day) => {
          const isToday = day.key === todayKey;
          const visibleTasks = day.tasks.slice(0, 4);
          const overflow = day.tasks.length - visibleTasks.length;

          return (
            <button
              key={day.key}
              type="button"
              onClick={() => setSelectedDay(day.key)}
              className={cn(
                "flex min-h-[150px] flex-col gap-1.5 rounded-xl border bg-card p-3 text-left transition hover:border-foreground/30",
                isToday && "border-primary/60 ring-1 ring-primary/30"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {day.date.toLocaleDateString("en-US", { weekday: "short" })}
                  </p>
                  <p className={cn("text-sm font-semibold", isToday && "text-primary")}>
                    {day.date.getDate()}
                  </p>
                </div>
                {day.totalSeconds > 0 && (
                  <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[10px]">
                    <Clock className="size-2.5" />
                    {formatDuration(day.totalSeconds)}
                  </Badge>
                )}
              </div>

              <div className="flex-1 space-y-1">
                {visibleTasks.map((task) => {
                  const category = categories.find((c) => c.id === task.category_id);
                  return (
                    <div key={task.id} className="flex items-center gap-1.5 truncate text-xs">
                      <span
                        className="size-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: category?.color ?? "#94a3b8" }}
                      />
                      <span className="truncate text-muted-foreground">{task.name}</span>
                    </div>
                  );
                })}
                {overflow > 0 && (
                  <p className="text-[11px] text-muted-foreground">+{overflow} more</p>
                )}
                {day.tasks.length === 0 && !loading && (
                  <p className="text-[11px] text-muted-foreground/60">No tasks</p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {selected?.date.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-2 overflow-y-auto px-4 pb-6">
            {selected && selected.tasks.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No tasks logged this day.</p>
            )}
            {selected?.tasks.map((task) => {
              const category = categories.find((c) => c.id === task.category_id);
              return (
                <div key={task.id} className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: category?.color ?? "#94a3b8" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{task.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatClockTime(task.start_time)} · {formatDuration(taskDuration(task))}
                      {category ? ` · ${category.name}` : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
