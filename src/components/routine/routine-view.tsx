"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Copy, MoreVertical, Pencil, Plus, Repeat, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RoutineItemDialog, type RoutineDraft } from "@/components/routine/routine-item-dialog";
import { useCategoriesContext } from "@/contexts/categories-context";
import { useTasksContext } from "@/contexts/tasks-context";
import { useRoutine, type RoutineItemInput } from "@/hooks/use-routine";
import { formatDuration } from "@/lib/utils/time";
import {
  EVERY_DAY,
  WEEKDAYS,
  WEEKDAYS_ONLY,
  formatMinuteOfDay,
  summarizeDays,
} from "@/lib/utils/routine";
import type { Category, RoutineItem } from "@/types/database";
import { cn } from "@/lib/utils";

type DayFilter = number | "all";

const TEMPLATES: (Omit<RoutineItemInput, "category_id" | "is_active"> & { category: string })[] = [
  { name: "Morning workout", start_minute: 390, duration_minutes: 45, days_of_week: EVERY_DAY, priority: "medium", category: "health" },
  { name: "Plan the day", start_minute: 510, duration_minutes: 15, days_of_week: WEEKDAYS_ONLY, priority: "medium", category: "personal" },
  { name: "Deep work", start_minute: 540, duration_minutes: 120, days_of_week: WEEKDAYS_ONLY, priority: "high", category: "work" },
  { name: "Read", start_minute: 1260, duration_minutes: 30, days_of_week: EVERY_DAY, priority: "low", category: "learning" },
];

function blankDraft(day: DayFilter): RoutineDraft {
  return {
    name: "",
    category_id: null,
    start_minute: 9 * 60,
    duration_minutes: 30,
    // Starting from a specific day's view? Pre-select just that day.
    days_of_week: day === "all" ? EVERY_DAY : [day],
    priority: "medium",
    is_active: true,
  };
}

export function RoutineView({
  initialItems,
  userId,
}: {
  initialItems: RoutineItem[];
  userId: string;
}) {
  const { items, addItem, updateItem, deleteItem } = useRoutine(initialItems, userId);
  const { tasks, applyRoutines } = useTasksContext();
  const { categories } = useCategoriesContext();

  const [todayDow] = useState(() => new Date().getDay());
  const [dayFilter, setDayFilter] = useState<DayFilter>(todayDow);
  const [draft, setDraft] = useState<RoutineDraft | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<RoutineItem | null>(null);

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.start_minute - b.start_minute || a.name.localeCompare(b.name)),
    [items]
  );

  const countsByDay = useMemo(() => {
    const counts = new Map<number, number>();
    for (const item of items) {
      if (!item.is_active) continue;
      for (const d of item.days_of_week) counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    return counts;
  }, [items]);

  const visible = dayFilter === "all" ? sorted : sorted.filter((i) => i.days_of_week.includes(dayFilter));
  const activeVisible = visible.filter((i) => i.is_active);
  const plannedMinutes = activeVisible.reduce((sum, i) => sum + i.duration_minutes, 0);

  function openNew(base?: RoutineDraft) {
    setDraft(base ?? blankDraft(dayFilter));
    setFormKey((k) => k + 1);
    setDialogOpen(true);
  }

  function openEdit(item: RoutineItem) {
    setDraft({ ...item });
    setFormKey((k) => k + 1);
    setDialogOpen(true);
  }

  function openTemplate(template: (typeof TEMPLATES)[number]) {
    const { category, ...rest } = template;
    const match = categories.find((c) => c.name.toLowerCase() === category);
    openNew({ ...rest, category_id: match?.id ?? null, is_active: true });
  }

  /** Adds anything newly due today to the Today list and reports it. */
  async function syncToday() {
    try {
      return (await applyRoutines()).length;
    } catch {
      return 0;
    }
  }

  async function handleSave(input: RoutineItemInput, id?: string) {
    try {
      if (id) {
        await updateItem(id, input);
        const added = await syncToday();
        const alreadyToday = tasks.some((t) => t.routine_id === id);
        toast.success("Routine updated", {
          description: added
            ? "Added to today's list."
            : alreadyToday
              ? "Today's task stays as it was — changes apply from the next time."
              : undefined,
        });
      } else {
        await addItem(input);
        const added = await syncToday();
        toast.success(`Added "${input.name}" to your routine`, {
          description: added ? "It's on today's list too." : `Repeats ${summarizeDays(input.days_of_week).toLowerCase()}.`,
        });
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save that routine task");
    }
  }

  async function handleDelete(id: string) {
    const item = items.find((i) => i.id === id);
    try {
      await deleteItem(id);
      toast.success(`Removed "${item?.name ?? "task"}" from your routine`);
      setDialogOpen(false);
      setPendingDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete that routine task");
    }
  }

  async function toggleActive(item: RoutineItem, active: boolean) {
    try {
      await updateItem(item.id, { is_active: active });
      if (active) await syncToday();
      toast.success(active ? `Resumed "${item.name}"` : `Paused "${item.name}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update that routine task");
    }
  }

  const selectedDayLabel =
    dayFilter === "all" ? "All days" : WEEKDAYS.find((d) => d.value === dayFilter)!.long;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Routine</h1>
          <p className="text-sm text-muted-foreground">
            Set it once — these tasks land on your Today list automatically, every week.
          </p>
        </div>
        <Button size="lg" onClick={() => openNew()} className="shrink-0">
          <Plus className="size-4" />
          <span className="hidden sm:inline">Add task</span>
          <span className="sr-only sm:hidden">Add routine task</span>
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState onAdd={() => openNew()} onTemplate={openTemplate} />
      ) : (
        <>
          {/* Day picker */}
          <div className="grid grid-cols-8 gap-1 rounded-xl border bg-card p-1 sm:gap-1.5 sm:p-1.5">
            <DayTab active={dayFilter === "all"} onClick={() => setDayFilter("all")} label="All" count={items.length} />
            {WEEKDAYS.map((day) => (
              <DayTab
                key={day.value}
                active={dayFilter === day.value}
                onClick={() => setDayFilter(day.value)}
                label={day.short}
                shortLabel={day.letter}
                count={countsByDay.get(day.value) ?? 0}
                isToday={day.value === todayDow}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="text-sm font-medium">{selectedDayLabel}</h2>
            {dayFilter === todayDow && (
              <Badge variant="secondary" className="h-5 px-1.5">
                Today
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">
              · {activeVisible.length} {activeVisible.length === 1 ? "task" : "tasks"}
              {plannedMinutes > 0 && ` · ${formatDuration(plannedMinutes * 60)} planned`}
            </span>
          </div>

          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-12 text-center">
              <Repeat className="size-7 text-muted-foreground" />
              <p className="text-sm font-medium">Nothing planned for {selectedDayLabel}</p>
              <p className="max-w-[240px] text-xs text-muted-foreground">
                Enjoy the free day — or add something you want to do every {selectedDayLabel}.
              </p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => openNew()}>
                <Plus className="size-3.5" />
                Add for {selectedDayLabel}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {visible.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <RoutineRow
                      item={item}
                      category={categories.find((c) => c.id === item.category_id) ?? null}
                      onEdit={() => openEdit(item)}
                      onDuplicate={() => {
                        openNew({
                          name: `${item.name} (copy)`,
                          category_id: item.category_id,
                          start_minute: item.start_minute,
                          duration_minutes: item.duration_minutes,
                          days_of_week: item.days_of_week,
                          priority: item.priority,
                          is_active: true,
                        });
                      }}
                      onDelete={() => setPendingDelete(item)}
                      onToggle={(active) => toggleActive(item, active)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      <RoutineItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        draft={draft}
        formKey={formKey}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove from routine?</DialogTitle>
            <DialogDescription>
              &ldquo;{pendingDelete?.name}&rdquo; won&apos;t be added to future days. Tasks already on
              your list stay put.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => pendingDelete && handleDelete(pendingDelete.id)}>
              <Trash2 className="size-4" />
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DayTab({
  active,
  onClick,
  label,
  shortLabel,
  count,
  isToday,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  shortLabel?: string;
  count: number;
  isToday?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "relative flex flex-col items-center gap-0.5 rounded-lg py-2 text-xs font-medium transition active:scale-95",
        active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <span className={cn(shortLabel && "hidden sm:inline")}>{label}</span>
      {shortLabel && <span className="sm:hidden">{shortLabel}</span>}
      <span
        className={cn(
          "text-[11px] tabular-nums",
          active ? "text-primary-foreground/80" : count === 0 ? "text-muted-foreground/50" : "text-foreground"
        )}
      >
        {count}
      </span>
      {isToday && (
        <span
          className={cn(
            "absolute top-1 right-1 size-1.5 rounded-full",
            active ? "bg-primary-foreground" : "bg-primary"
          )}
          aria-label="Today"
        />
      )}
    </button>
  );
}

function RoutineRow({
  item,
  category,
  onEdit,
  onDuplicate,
  onDelete,
  onToggle,
}: {
  item: RoutineItem;
  category: Category | null;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggle: (active: boolean) => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border bg-card py-3 pr-2 pl-3 transition-colors hover:border-foreground/20",
        !item.is_active && "opacity-60"
      )}
    >
      <button type="button" onClick={onEdit} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <div className="w-14 shrink-0 text-right sm:w-16">
          <p className="text-sm font-medium tabular-nums">{formatMinuteOfDay(item.start_minute)}</p>
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {formatMinuteOfDay(item.start_minute + item.duration_minutes)}
          </p>
        </div>
        <span
          className="w-1 self-stretch rounded-full bg-muted"
          style={category ? { backgroundColor: category.color } : undefined}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{item.name}</p>
            {item.priority === "high" && (
              <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                High
              </Badge>
            )}
            {!item.is_active && (
              <Badge variant="outline" className="h-4 px-1 text-[10px]">
                Paused
              </Badge>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span>{formatDuration(item.duration_minutes * 60)}</span>
            {category && <span>· {category.name}</span>}
            <span className="inline-flex items-center gap-1">
              · <Repeat className="size-3" />
              {summarizeDays(item.days_of_week)}
            </span>
          </div>
        </div>
      </button>

      <Switch
        checked={item.is_active}
        onCheckedChange={(checked) => onToggle(checked)}
        aria-label={item.is_active ? "Pause this routine task" : "Resume this routine task"}
        className="mx-1"
      />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
              aria-label="Routine task options"
            />
          }
        >
          <MoreVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDuplicate}>
            <Copy />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function EmptyState({
  onAdd,
  onTemplate,
}: {
  onAdd: () => void;
  onTemplate: (template: (typeof TEMPLATES)[number]) => void;
}) {
  return (
    <div className="rounded-xl border border-dashed p-6 text-center sm:p-10">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Repeat className="size-5" />
      </div>
      <p className="mt-3 text-base font-medium">Build your daily routine</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        Add the things you do regularly and pick the days. They&apos;ll appear on Today by
        themselves — no retyping every morning.
      </p>
      <Button className="mt-4" size="lg" onClick={onAdd}>
        <Plus className="size-4" />
        Add your first task
      </Button>

      <div className="mt-6 border-t pt-5">
        <p className="mb-2.5 flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Sparkles className="size-3.5" />
          Or start from an idea
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.name}
              type="button"
              onClick={() => onTemplate(t)}
              className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5 text-left transition hover:border-foreground/30"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{t.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {formatMinuteOfDay(t.start_minute)} · {formatDuration(t.duration_minutes * 60)} ·{" "}
                  {summarizeDays(t.days_of_week)}
                </span>
              </span>
              <Plus className="size-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
