"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  LayoutDashboard,
  LineChart,
  Settings,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_PREFIX = "momentum:onboarding-seen:";

interface Slide {
  icon: LucideIcon;
  accent: string;
  title: string;
  description: string;
}

const SLIDES: Slide[] = [
  {
    icon: TrendingUp,
    accent: "#2a78d6",
    title: "Welcome to Momentum",
    description: "Log your day in seconds and watch your growth over time. Here's a quick look around.",
  },
  {
    icon: Sparkles,
    accent: "#eb6834",
    title: "Add a task in one line",
    description:
      'Type naturally — "Gym 7-8am #health" sets the time and category for you. Just type a name and hit Start to begin a live timer right now. Press N or ⌘/Ctrl+K from anywhere to jump here.',
  },
  {
    icon: LayoutDashboard,
    accent: "#1baf7a",
    title: "Today — your daily view",
    description:
      "See today's time tracked, completion rate, and streak at a glance, with your full timeline below. On mobile, swipe a task right to finish it, left to delete it (with undo).",
  },
  {
    icon: CalendarDays,
    accent: "#eda100",
    title: "Calendar — your week at a glance",
    description: "Browse past and future weeks, and tap any day to see everything you logged on it.",
  },
  {
    icon: LineChart,
    accent: "#e87ba4",
    title: "Insights — track your growth",
    description:
      "Switch between Week, Month, and Year to see your trend chart, where your time goes by category, and a full year activity heatmap.",
  },
  {
    icon: Settings,
    accent: "#4a3aa7",
    title: "Settings — make it yours",
    description: "Create custom categories with colors, update your profile, and switch between light and dark mode.",
  },
];

/**
 * A one-time, multi-slide welcome tour. Shown only the first time a given
 * account is seen on this browser (tracked in localStorage); the user can
 * skip at any point and it won't come back.
 */
export function OnboardingTour({ userKey }: { userKey: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const storageKey = `${STORAGE_PREFIX}${userKey}`;

  useEffect(() => {
    try {
      if (!localStorage.getItem(storageKey)) {
        // localStorage only exists client-side, so this can't be derived
        // during render — it has to be checked after mount.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setOpen(true);
      }
    } catch {
      // localStorage unavailable (private browsing, etc.) — just skip the tour.
    }
  }, [storageKey]);

  function finish() {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      // ignore — worst case the tour reappears next visit
    }
    setOpen(false);
  }

  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && finish()}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <div
            className="mb-1 flex size-11 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${slide.accent}1a`, color: slide.accent }}
          >
            <slide.icon className="size-5" />
          </div>
          <DialogTitle className="text-lg">{slide.title}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">{slide.description}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-1.5 py-1">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === step ? "w-5 bg-primary" : "w-1.5 bg-muted"
              )}
            />
          ))}
        </div>

        <DialogFooter>
          <div className="flex w-full items-center justify-between gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={finish} className="text-muted-foreground">
              Skip
            </Button>
            <div className="flex gap-2">
              {step > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
                  Back
                </Button>
              )}
              <Button type="button" size="sm" onClick={() => (isLast ? finish() : setStep((s) => s + 1))}>
                {isLast ? "Get started" : "Next"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
