import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  sublabel,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sublabel?: string;
  icon: LucideIcon;
  accent?: string;
}) {
  return (
    <Card className="gap-0 py-4">
      <CardContent className="flex items-center gap-3 px-4">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${accent ?? "#6366f1"}1a`, color: accent ?? "#6366f1" }}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className={cn("truncate text-xl font-semibold leading-tight")}>{value}</p>
          <p className="truncate text-xs text-muted-foreground">
            {label}
            {sublabel ? ` · ${sublabel}` : ""}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
