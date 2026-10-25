"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import { millisecondsUntilNextShanghaiDate, shanghaiDateKey } from "../lib/school-calendar";

const BakedTodayContext = createContext<string | null>(null);

export function BakedTodayProvider({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  return <BakedTodayContext value={value}>{children}</BakedTodayContext>;
}

function subscribeToShanghaiDate(onChange: () => void) {
  let timer = 0;
  const schedule = () => {
    const delay = Math.max(1_000, millisecondsUntilNextShanghaiDate());
    timer = window.setTimeout(() => {
      onChange();
      schedule();
    }, delay);
  };
  schedule();
  return () => window.clearTimeout(timer);
}

function bakedShanghaiDate() {
  if (typeof document !== "undefined") {
    const baked = document.documentElement.getAttribute("data-today");
    if (baked) return baked;
  }
  return null;
}

export function useShanghaiToday() {
  const provided = useContext(BakedTodayContext);
  return useSyncExternalStore(
    subscribeToShanghaiDate,
    shanghaiDateKey,
    () => provided || bakedShanghaiDate() || shanghaiDateKey(),
  );
}
