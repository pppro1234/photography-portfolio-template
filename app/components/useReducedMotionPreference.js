"use client";

import { useSyncExternalStore } from "react";
import { createReducedMotionStore } from "../lib/reduced-motion.mjs";

const preference = createReducedMotionStore(() =>
  typeof window === "undefined" ? null : window.matchMedia("(prefers-reduced-motion: reduce)")
);

export function useReducedMotionPreference() {
  return useSyncExternalStore(preference.subscribe, preference.getSnapshot, preference.getServerSnapshot);
}
