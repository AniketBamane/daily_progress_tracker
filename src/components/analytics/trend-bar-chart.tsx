"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDuration } from "@/lib/utils/time";

export interface TrendPoint {
  label: string;
  seconds: number;
}

export function TrendBarChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={40}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickFormatter={(value: number) => (value > 0 ? `${Math.round(value / 3600)}h` : "0")}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            formatter={(value) => [formatDuration(Number(value) || 0), "Tracked"]}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              color: "var(--popover-foreground)",
              fontSize: 12,
            }}
          />
          <Bar dataKey="seconds" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
