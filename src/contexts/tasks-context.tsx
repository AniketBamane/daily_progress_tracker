"use client";

import { createContext, useContext } from "react";
import { useTasks } from "@/hooks/use-tasks";
import type { Task } from "@/types/database";

type TasksContextValue = ReturnType<typeof useTasks>;

const TasksContext = createContext<TasksContextValue | null>(null);

export function TasksProvider({
  children,
  initialTasks,
  userId,
}: {
  children: React.ReactNode;
  initialTasks: Task[];
  userId: string;
}) {
  const value = useTasks(initialTasks, userId);
  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasksContext() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasksContext must be used within a TasksProvider");
  return ctx;
}
