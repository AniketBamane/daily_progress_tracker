"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Clock, Sparkles, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/kpi-card";
import { TrendBarChart, type TrendPoint } from "@/components/analytics/trend-bar-chart";
import { CategoryDonut } from "@/components/analytics/category-donut";
import { ActivityHeatmap } from "@/components/analytics/activity-heatmap";
import { useCategoriesContext } from "@/contexts/categories-context";
import { useNow } from "@/hooks/use-now";
import {
  buildCategoryTotals,
  buildDailyTotals,
  percentChange,
  taskSeconds,
  weekdayAverages,
} from "@/lib/utils/analytics";
import { dayKey, formatDuration } from "@/lib/utils/time";
import type { Task } from "@/types/database";

type Period = "week" | "month" | "year";

function rangeTasks(tasks: Task[], start: Date, end: Date) {
  return tasks.filter((t) => {
    const d = new Date(t.start_time);
    return d >= start && d < end;
  });
}

export function AnalyticsView({ tasks }: { tasks: Task[] }) {
  const [period, setPeriod] = useState<Period>("week");
  const { categories } = useCategoriesContext();

  const now = useNow();

  const periodData = useMemo(() => {
    const dayMs = 86400000;
    const lengthDays = period === "week" ? 7 : period === "month" ? 30 : 365;

    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const start = new Date(end.getTime() - lengthDays * dayMs);
    const prevStart = new Date(start.getTime() - lengthDays * dayMs);

    const currentTasks = rangeTasks(tasks, start, end);
    const previous = rangeTasks(tasks, prevStart, start);

    const currentTotal = currentTasks.reduce((sum, t) => sum + taskSeconds(t, now), 0);
    const previousTotal = previous.reduce((sum, t) => sum + taskSeconds(t, now), 0);

    const dailyTotals = buildDailyTotals(currentTasks, now);

    let trend: TrendPoint[];
    if (period === "year") {
      const months = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
        return { year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleDateString("en-US", { month: "short" }) };
      });
      trend = months.map((m) => {
        const seconds = currentTasks
          .filter((t) => {
            const d = new Date(t.start_time);
            return d.getFullYear() === m.year && d.getMonth() === m.month;
          })
          .reduce((sum, t) => sum + taskSeconds(t, now), 0);
        return { label: m.label, seconds };
      });
    } else {
      const days = Array.from({ length: lengthDays }, (_, i) => {
        const d = new Date(start.getTime() + i * dayMs);
        return d;
      });
      // Month view: thin out labels so the axis stays readable.
      trend = days.map((d, i) => ({
        label:
          period === "week" || i % 5 === 0
            ? d.toLocaleDateString("en-US", { weekday: period === "week" ? "short" : undefined, day: period === "month" ? "numeric" : undefined })
            : "",
        seconds: dailyTotals.get(dayKey(d)) ?? 0,
      }));
    }

    const done = currentTasks.filter((t) => t.status === "done").length;
    const completionRate = currentTasks.length > 0 ? Math.round((done / currentTasks.length) * 100) : 0;

    return {
      periodTasks: currentTasks,
      currentTotal,
      previousTotal,
      change: percentChange(currentTotal, previousTotal),
      trend,
      completionRate,
      taskCount: currentTasks.length,
      avgPerDay: currentTotal / lengthDays,
    };
  }, [tasks, period, now]);

  const categoryTotals = useMemo(
    () => buildCategoryTotals(periodData.periodTasks, categories, now),
    [periodData, categories, now]
  );

  const bestWeekday = useMemo(() => {
    const averages = weekdayAverages(tasks, now);
    return averages.reduce((best, w) => (w.avgSeconds > best.avgSeconds ? w : best), averages[0]);
  }, [tasks, now]);

  const yearlyTotals = useMemo(() => buildDailyTotals(tasks, now), [tasks, now]);

  const insight = useMemo(() => {
    if (periodData.change === null || periodData.currentTotal === 0) {
      return `Log a few tasks this ${period} to start seeing trends.`;
    }
    const direction = periodData.change >= 0 ? "up" : "down";
    return `You tracked ${Math.abs(periodData.change)}% ${direction} compared to the previous ${period}.`;
  }, [periodData, period]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
          <p className="text-sm text-muted-foreground">See how your time adds up.</p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Total tracked" value={formatDuration(periodData.currentTotal)} icon={Clock} accent="#2a78d6" />
        <KpiCard
          label="Daily average"
          value={formatDuration(periodData.avgPerDay)}
          icon={Sparkles}
          accent="#1baf7a"
        />
        <KpiCard
          label="Completion rate"
          value={`${periodData.completionRate}%`}
          sublabel={`${periodData.taskCount} tasks`}
          icon={CheckCircle2}
          accent="#eda100"
        />
        <KpiCard
          label="Best day"
          value={bestWeekday?.weekday ?? "—"}
          sublabel="on average"
          icon={Trophy}
          accent="#e87ba4"
        />
      </div>

      <Card>
        <CardContent className="flex items-center gap-3 py-4">
          {periodData.change !== null && periodData.change >= 0 ? (
            <TrendingUp className="size-5 shrink-0 text-[#1baf7a]" />
          ) : (
            <TrendingDown className="size-5 shrink-0 text-muted-foreground" />
          )}
          <p className="text-sm">{insight}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            {period === "year" ? "Hours by month" : "Hours by day"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TrendBarChart data={periodData.trend} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Where your time went</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryDonut data={categoryTotals} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">{now.getFullYear()} activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityHeatmap dailyTotals={yearlyTotals} year={now.getFullYear()} />
        </CardContent>
      </Card>
    </div>
  );
}
