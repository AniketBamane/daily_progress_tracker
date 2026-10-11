import { TrendingUp } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-muted/30 px-4 py-10">
      <div className="flex items-center gap-2 text-foreground">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <TrendingUp className="size-5" />
        </div>
        <span className="text-lg font-semibold tracking-tight">Momentum</span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
