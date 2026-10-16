"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, TrendingUp } from "lucide-react";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { OnboardingTour } from "@/components/onboarding/onboarding-tour";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { QuickAddBar } from "@/components/quick-add/quick-add-bar";
import { ActiveTimerBar } from "@/components/tasks/active-timer-bar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useTasksContext } from "@/contexts/tasks-context";
import { cn } from "@/lib/utils";

export function AppShell({
  fullName,
  email,
  children,
}: {
  fullName: string | null;
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const { tasks } = useTasksContext();
  const hasRunning = tasks.some((t) => t.is_running);

  return (
    <div className="flex min-h-svh">
      <OnboardingTour userKey={email} />

      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-card/40 md:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <TrendingUp className="size-4" />
          </div>
          <span className="font-semibold tracking-tight">Momentum</span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center justify-between border-t px-4 py-3">
          <UserMenu fullName={fullName} email={email} />
          <ThemeToggle />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top header */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background/80 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <TrendingUp className="size-3.5" />
            </div>
          </div>

          <div className="hidden flex-1 md:block">
            <QuickAddBar />
          </div>

          <div className="ml-auto flex items-center gap-2 md:ml-0">
            {hasRunning && <ActiveTimerBar className="hidden sm:flex" />}
            <div className="md:hidden">
              <ThemeToggle />
            </div>
            <div className="md:hidden">
              <UserMenu fullName={fullName} email={email} />
            </div>
          </div>
        </header>

        {hasRunning && (
          <div className="border-b bg-background px-4 py-2 sm:hidden">
            <ActiveTimerBar className="w-full justify-center" />
          </div>
        )}

        <main className="flex-1 overflow-y-auto px-4 pb-24 pt-4 md:px-6 md:pb-8 md:pt-6">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>

      {/* Mobile bottom nav + floating quick-add */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t bg-background/95 py-2 backdrop-blur md:hidden">
        {NAV_ITEMS.slice(0, 2).map((item) => (
          <MobileNavLink key={item.href} item={item} active={pathname === item.href} />
        ))}

        <button
          type="button"
          onClick={() => setQuickAddOpen(true)}
          aria-label="Add task"
          className="-mt-6 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition active:scale-95"
        >
          <Plus className="size-6" />
        </button>

        {/* Settings stays reachable from the avatar menu in the mobile header. */}
        {NAV_ITEMS.slice(2)
          .filter((item) => item.href !== "/settings")
          .map((item) => (
            <MobileNavLink key={item.href} item={item} active={pathname === item.href} />
          ))}
      </nav>

      <Sheet open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <SheetContent side="bottom" className="pb-8">
          <SheetHeader>
            <SheetTitle>Add a task</SheetTitle>
          </SheetHeader>
          <div className="px-4">
            <QuickAddBar autoFocus onAdded={() => setQuickAddOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function MobileNavLink({
  item,
  active,
}: {
  item: (typeof NAV_ITEMS)[number];
  active: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex w-14 flex-col items-center gap-0.5 rounded-lg py-1 text-[11px] font-medium",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      <item.icon className="size-5" />
      {item.label}
    </Link>
  );
}
