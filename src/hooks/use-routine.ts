"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RoutineItem } from "@/types/database";

export type RoutineItemInput = Pick<
  RoutineItem,
  "name" | "category_id" | "start_minute" | "duration_minutes" | "days_of_week" | "priority" | "is_active"
>;

export function useRoutine(initialItems: RoutineItem[], userId: string) {
  const [items, setItems] = useState<RoutineItem[]>(initialItems);
  const [supabase] = useState(() => createClient());

  const addItem = useCallback(
    async (input: RoutineItemInput) => {
      const { data, error } = await supabase
        .from("routine_items")
        .insert({ ...input, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      setItems((prev) => [...prev, data]);
      return data;
    },
    [supabase, userId]
  );

  const updateItem = useCallback(
    async (id: string, patch: Partial<RoutineItemInput>) => {
      let previous: RoutineItem | undefined;
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          previous = item;
          return { ...item, ...patch };
        })
      );
      const { error } = await supabase.from("routine_items").update(patch).eq("id", id);
      if (error) {
        if (previous) setItems((prev) => prev.map((item) => (item.id === id ? previous! : item)));
        throw error;
      }
    },
    [supabase]
  );

  const deleteItem = useCallback(
    async (id: string) => {
      let removed: RoutineItem | undefined;
      setItems((prev) => {
        removed = prev.find((item) => item.id === id);
        return prev.filter((item) => item.id !== id);
      });
      const { error } = await supabase.from("routine_items").delete().eq("id", id);
      if (error) {
        if (removed) setItems((prev) => [...prev, removed!]);
        throw error;
      }
    },
    [supabase]
  );

  return { items, addItem, updateItem, deleteItem };
}
