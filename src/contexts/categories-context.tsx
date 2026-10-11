"use client";

import { createContext, useContext } from "react";
import { useCategories } from "@/hooks/use-categories";
import type { Category } from "@/types/database";

type CategoriesContextValue = ReturnType<typeof useCategories>;

const CategoriesContext = createContext<CategoriesContextValue | null>(null);

export function CategoriesProvider({
  children,
  initialCategories,
  userId,
}: {
  children: React.ReactNode;
  initialCategories: Category[];
  userId: string;
}) {
  const value = useCategories(initialCategories, userId);
  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}

export function useCategoriesContext() {
  const ctx = useContext(CategoriesContext);
  if (!ctx) throw new Error("useCategoriesContext must be used within a CategoriesProvider");
  return ctx;
}
