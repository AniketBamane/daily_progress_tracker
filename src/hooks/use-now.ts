"use client";

import { useEffect, useReducer } from "react";

/**
 * Returns the current time, re-rendering the caller every `intervalMs` so
 * time-derived UI (task phase, "time tracked so far", etc.) stays in sync
 * without a page refresh.
 */
export function useNow(intervalMs = 30000): Date {
  const [, tick] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return new Date();
}
