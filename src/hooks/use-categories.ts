"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Category } from "@/types/database";

// Validated categorical palette (CVD-safe, fixed order) — see dataviz skill reference.
export const PALETTE = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#4a3aa7", // violet
  "#e34948", // red
];

export function useCategories(initialCategories: Category[], userId: string) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [supabase] = useState(() => createClient());

  const addCategory = useCallback(
    async (name: string, color?: string) => {
      const chosenColor = color ?? PALETTE[categories.length % PALETTE.length];
      const { data, error } = await supabase
        .from("categories")
        .insert({ user_id: userId, name, color: chosenColor, sort_order: categories.length })
        .select()
        .single();
      if (error) throw error;
      setCategories((prev) => [...prev, data]);
      return data;
    },
    [supabase, userId, categories.length]
  );

  const updateCategory = useCallback(
    async (id: string, patch: Partial<Category>) => {
      setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
      const { error } = await supabase.from("categories").update(patch).eq("id", id);
      if (error) throw error;
    },
    [supabase]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      const prevCategories = categories;
      setCategories((prev) => prev.filter((c) => c.id !== id));
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) {
        setCategories(prevCategories);
        throw error;
      }
    },
    [supabase, categories]
  );

  return { categories, addCategory, updateCategory, deleteCategory };
}
