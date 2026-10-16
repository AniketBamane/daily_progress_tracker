"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCategoriesContext } from "@/contexts/categories-context";
import type { RoutineItemInput } from "@/hooks/use-routine";
import { formatDuration } from "@/lib/utils/time";
import {
  EVERY_DAY,
  WEEKDAYS,
  WEEKDAYS_ONLY,
  WEEKENDS_ONLY,
  inputToMinute,
  minuteToInput,
  summarizeDays,
} from "@/lib/utils/routine";
import type { TaskPriority } from "@/types/database";
import { cn } from "@/lib/utils";

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];
const PRIORITIES: TaskPriority[] = ["low", "medium", "high"];

export interface RoutineDraft extends RoutineItemInput {
  id?: string;
}

export function RoutineItemDialog({
  open,
  onOpenChange,
  draft,
  formKey,
  onSave,
  onDelete,
}: {
  open: boolean;
  formKey: number;
  onOpenChange: (open: boolean) => void;
  draft: RoutineDraft | null;
  onSave: (input: RoutineItemInput, id?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
        {/* Keyed so the form state resets every time a different item is opened. */}
        {draft && (
          <RoutineForm
            key={formKey}
            draft={draft}
            onCancel={() => onOpenChange(false)}
            onSave={onSave}
            onDelete={onDelete}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RoutineForm({
  draft,
  onCancel,
  onSave,
  onDelete,
}: {
  draft: RoutineDraft;
  onCancel: () => void;
  onSave: (input: RoutineItemInput, id?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}) {
  const { categories } = useCategoriesContext();
  const isEditing = Boolean(draft.id);

  const [name, setName] = useState(draft.name);
  const [start, setStart] = useState(minuteToInput(draft.start_minute));
  const [end, setEnd] = useState(minuteToInput(draft.start_minute + draft.duration_minutes));
  const [days, setDays] = useState<number[]>(draft.days_of_week);
  const [categoryId, setCategoryId] = useState<string | null>(draft.category_id);
  const [priority, setPriority] = useState<TaskPriority>(draft.priority);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const startMinute = inputToMinute(start);
  const endMinute = inputToMinute(end);
  // An end time earlier than the start wraps past midnight (e.g. 11 PM – 1 AM).
  const duration =
    startMinute !== null && endMinute !== null ? (endMinute - startMinute + 1440) % 1440 : 0;

  const nameError = !name.trim();
  const timeError = startMinute === null || endMinute === null || duration === 0;
  const daysError = days.length === 0;
  const canSave = !nameError && !timeError && !daysError && !saving;

  function toggleDay(value: number) {
    setDays((prev) => (prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]));
  }

  function applyDuration(minutes: number) {
    if (startMinute === null) return;
    setEnd(minuteToInput(startMinute + minutes));
  }

  function changeStart(value: string) {
    // Keep the same length when moving the start time — feels more natural
    // than leaving the end where it was.
    const next = inputToMinute(value);
    setStart(value);
    if (next !== null && duration > 0) setEnd(minuteToInput(next + duration));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave || startMinute === null) return;
    setSaving(true);
    try {
      await onSave(
        {
          name: name.trim(),
          start_minute: startMinute,
          duration_minutes: duration,
          days_of_week: [...days].sort((a, b) => a - b),
          category_id: categoryId,
          priority,
          is_active: draft.is_active,
        },
        draft.id
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!draft.id || !onDelete) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setSaving(true);
    try {
      await onDelete(draft.id);
    } finally {
      setSaving(false);
    }
  }

  const presetActive = (preset: number[]) =>
    preset.length === days.length && preset.every((d) => days.includes(d));

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <DialogHeader>
        <DialogTitle>{isEditing ? "Edit routine task" : "New routine task"}</DialogTitle>
        <DialogDescription>
          It will show up on your Today list automatically on the days you pick.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-2">
        <Label htmlFor="routine-name">Task</Label>
        <Input
          id="routine-name"
          autoFocus={!isEditing}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Morning workout"
          className="h-10"
          maxLength={120}
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label>Time</Label>
          {!timeError && (
            <span className="text-xs text-muted-foreground">{formatDuration(duration * 60)}</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1">
            <span className="text-xs text-muted-foreground">Start</span>
            <Input
              type="time"
              value={start}
              onChange={(e) => changeStart(e.target.value)}
              className="h-10"
              aria-label="Start time"
            />
          </div>
          <div className="grid gap-1">
            <span className="text-xs text-muted-foreground">End</span>
            <Input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="h-10"
              aria-label="End time"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {DURATION_PRESETS.map((minutes) => (
            <Chip key={minutes} active={duration === minutes} onClick={() => applyDuration(minutes)}>
              {formatDuration(minutes * 60)}
            </Chip>
          ))}
        </div>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label>Repeat on</Label>
          <span className={cn("text-xs", daysError ? "text-destructive" : "text-muted-foreground")}>
            {daysError ? "Pick at least one day" : summarizeDays(days)}
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((day) => {
            const active = days.includes(day.value);
            return (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                aria-pressed={active}
                aria-label={day.long}
                className={cn(
                  "flex h-10 items-center justify-center rounded-lg border text-sm font-medium transition active:scale-95",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                )}
              >
                <span className="sm:hidden">{day.letter}</span>
                <span className="hidden sm:inline">{day.short}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={presetActive(EVERY_DAY)} onClick={() => setDays(EVERY_DAY)}>
            Every day
          </Chip>
          <Chip active={presetActive(WEEKDAYS_ONLY)} onClick={() => setDays(WEEKDAYS_ONLY)}>
            Weekdays
          </Chip>
          <Chip active={presetActive(WEEKENDS_ONLY)} onClick={() => setDays(WEEKENDS_ONLY)}>
            Weekends
          </Chip>
        </div>
      </div>

      {categories.length > 0 && (
        <div className="grid gap-2">
          <Label>Category</Label>
          <div className="flex flex-wrap gap-1.5">
            <Chip active={categoryId === null} onClick={() => setCategoryId(null)}>
              None
            </Chip>
            {categories.map((c) => (
              <Chip key={c.id} active={categoryId === c.id} onClick={() => setCategoryId(c.id)}>
                <span className="size-2 rounded-full" style={{ backgroundColor: c.color }} />
                {c.name}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-2">
        <Label>Priority</Label>
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
          {PRIORITIES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              aria-pressed={priority === p}
              className={cn(
                "rounded-md py-1.5 text-xs font-medium capitalize transition",
                priority === p
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <DialogFooter className="sm:justify-between">
        {isEditing && onDelete ? (
          <Button
            type="button"
            variant={confirmDelete ? "destructive" : "ghost"}
            onClick={handleDelete}
            disabled={saving}
            className="text-destructive"
          >
            <Trash2 className="size-4" />
            {confirmDelete ? "Tap again to delete" : "Delete"}
          </Button>
        ) : (
          <span className="hidden sm:block" />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canSave}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {isEditing ? "Save changes" : "Add to routine"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "bg-muted/50 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
