"use client";

import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { dayKey, formatDuration } from "@/lib/utils/time";
import { cn } from "@/lib/utils";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function intensityClass(seconds: number, max: number) {
  if (seconds <= 0) return "bg-muted";
  const ratio = max > 0 ? seconds / max : 0;
  if (ratio > 0.75) return "bg-primary";
  if (ratio > 0.5) return "bg-primary/70";
  if (ratio > 0.25) return "bg-primary/45";
  return "bg-primary/25";
}

export function ActivityHeatmap({ dailyTotals, year }: { dailyTotals: Map<string, number>; year: number }) {
  const { weeks, monthMarkers, max } = useMemo(() => {
    const jan1 = new Date(year, 0, 1);
    const dec31 = new Date(year, 11, 31);

    // Start the grid on the Sunday on/before Jan 1 so weeks align into columns.
    const gridStart = new Date(jan1);
    gridStart.setDate(gridStart.getDate() - gridStart.getDay());

    const days: { date: Date; key: string; inYear: boolean }[] = [];
    const cursor = new Date(gridStart);
    while (cursor <= dec31) {
      days.push({ date: new Date(cursor), key: dayKey(cursor), inYear: cursor.getFullYear() === year });
      cursor.setDate(cursor.getDate() + 1);
    }

    const weeks: typeof days[] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    const monthMarkers: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, i) => {
      const firstInYearDay = week.find((d) => d.inYear);
      if (firstInYearDay && firstInYearDay.date.getMonth() !== lastMonth) {
        lastMonth = firstInYearDay.date.getMonth();
        monthMarkers.push({ label: MONTH_LABELS[lastMonth], weekIndex: i });
      }
    });

    const max = Math.max(1, ...Array.from(dailyTotals.values()));

    return { weeks, monthMarkers, max };
  }, [dailyTotals, year]);

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex min-w-full flex-col gap-1">
        <div className="relative ml-6 flex gap-[3px] text-[10px] text-muted-foreground">
          {monthMarkers.map((m) => (
            <span key={`${m.label}-${m.weekIndex}`} style={{ marginLeft: m.weekIndex === 0 ? 0 : undefined }}>
              {m.label}
            </span>
          ))}
        </div>
        <div className="flex gap-[3px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((day) => {
                const seconds = dailyTotals.get(day.key) ?? 0;
                return (
                  <Tooltip key={day.key}>
                    <TooltipTrigger
                      render={
                        <div
                          className={cn(
                            "size-[11px] rounded-[2px]",
                            day.inYear ? intensityClass(seconds, max) : "bg-transparent"
                          )}
                        />
                      }
                    />

                    {day.inYear && (
                      <TooltipContent>
                        {day.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ·{" "}
                        {seconds > 0 ? formatDuration(seconds) : "No activity"}
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
