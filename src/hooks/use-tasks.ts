"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Task } from "@/types/database";

export interface NewTaskInput {
  name: string;
  category_id?: string | null;
  notes?: string | null;
  start_time?: string;
  end_time?: string | null;
  duration_seconds?: number | null;
  status?: Task["status"];
  priority?: Task["priority"];
  is_running?: boolean;
}

/**
 * Client-side task store: seeded from a server-rendered initial list, kept in
 * sync across tabs/devices via Supabase Realtime, with optimistic local
 * updates so the UI never waits on a round trip to feel responsive.
 */
export function useTasks(initialTasks: Task[], userId: string) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    const channel = supabase
      .channel(`tasks-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${userId}` },
        (payload) => {
          setTasks((prev) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new as Task;
              if (prev.some((t) => t.id === row.id)) return prev;
              return [row, ...prev];
            }
            if (payload.eventType === "UPDATE") {
              const row = payload.new as Task;
              return prev.map((t) => (t.id === row.id ? row : t));
            }
            if (payload.eventType === "DELETE") {
              const row = payload.old as Task;
              return prev.filter((t) => t.id !== row.id);
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  const addTask = useCallback(
    async (input: NewTaskInput) => {
      const optimisticId = `optimistic-${crypto.randomUUID()}`;
      const nowIso = new Date().toISOString();
      const optimisticTask: Task = {
        id: optimisticId,
        user_id: userId,
        category_id: input.category_id ?? null,
        name: input.name,
        notes: input.notes ?? null,
        start_time: input.start_time ?? nowIso,
        end_time: input.end_time ?? null,
        duration_seconds: input.duration_seconds ?? null,
        status: input.status ?? "in_progress",
        priority: input.priority ?? "medium",
        is_running: input.is_running ?? false,
        created_at: nowIso,
        updated_at: nowIso,
      };

      setTasks((prev) => [optimisticTask, ...prev]);

      const { data, error } = await supabase
        .from("tasks")
        .insert({ ...input, user_id: userId })
        .select()
        .single();

      if (error) {
        setTasks((prev) => prev.filter((t) => t.id !== optimisticId));
        throw error;
      }

      setTasks((prev) => {
        const withoutDuplicates = prev.filter((t) => t.id !== optimisticId && t.id !== data.id);
        return [data, ...withoutDuplicates];
      });

      return data;
    },
    [supabase, userId]
  );

  const updateTask = useCallback(
    async (id: string, patch: Partial<Task>) => {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      const { error } = await supabase.from("tasks").update(patch).eq("id", id);
      if (error) throw error;
    },
    [supabase]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      let removed: Task | undefined;
      setTasks((prev) => {
        removed = prev.find((t) => t.id === id);
        return prev.filter((t) => t.id !== id);
      });
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) {
        if (removed) setTasks((prev) => [removed!, ...prev]);
        throw error;
      }
      return removed;
    },
    [supabase]
  );

  /** Stops whichever task is currently running (used before starting a new timer). */
  const stopRunningTask = useCallback(
    async (endTime: Date = new Date()) => {
      const running = tasks.find((t) => t.is_running);
      if (!running) return;

      const durationSeconds = Math.max(
        1,
        Math.round((endTime.getTime() - new Date(running.start_time).getTime()) / 1000)
      );

      await updateTask(running.id, {
        is_running: false,
        status: "done",
        end_time: endTime.toISOString(),
        duration_seconds: durationSeconds,
      });
    },
    [tasks, updateTask]
  );

  return { tasks, setTasks, addTask, updateTask, deleteTask, stopRunningTask };
}
