"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CategoryTotal } from "@/lib/utils/analytics";
import { formatDuration } from "@/lib/utils/time";

export function CategoryDonut({ data }: { data: CategoryTotal[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        No tracked time in this period yet.
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.seconds, 0);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="h-56 w-full sm:w-56 sm:shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="seconds"
              nameKey="name"
              innerRadius="62%"
              outerRadius="90%"
              paddingAngle={2}
              stroke="var(--card)"
              strokeWidth={2}
            >
              {data.map((entry) => (
                <Cell key={entry.id} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [formatDuration(Number(value) || 0), String(name)]}
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                color: "var(--popover-foreground)",
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        {data.map((entry) => {
          const pct = total > 0 ? Math.round((entry.seconds / total) * 100) : 0;
          return (
            <div key={entry.id} className="flex items-center gap-2 text-sm">
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="min-w-0 flex-1 truncate">{entry.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatDuration(entry.seconds)} · {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
