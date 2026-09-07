"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { observeNearViewport } from "../lib/near-viewport.mjs";

export function useNearViewport(ref) {
  const [isNear, setIsNear] = useState(false);
  useLayoutEffect(() => {
    if (!ref.current) return;
    return observeNearViewport(ref.current, setIsNear);
  }, [ref]);
  return isNear;
}

export function usePageVisible() {
  const [isVisible, setIsVisible] = useState(true);
  useEffect(() => {
    const update = () => setIsVisible(document.visibilityState !== "hidden");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return isVisible;
}
