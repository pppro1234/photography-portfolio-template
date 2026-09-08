"use client";

import { useLayoutEffect, useRef } from "react";
import { useGalleryFilterHistory } from "./GalleryFilterMotionProvider";
import { shouldAnimateSeriesIntro } from "../lib/gallery-filter-motion.mjs";

export default function IntroCopyMotion({ category, description = false, children }) {
  const copyRef = useRef(null);
  const entranceRef = useRef(null);
  const history = useGalleryFilterHistory();

  useLayoutEffect(() => {
    const copy = copyRef.current;
    // Read after the previous route's cleanup; keep the same origin when
    // Strict Mode replays effects. The server-rendered text stays visible.
    if (!entranceRef.current || entranceRef.current.category !== category) {
      entranceRef.current = { category, previous: history.current };
    }
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finish = () => { delete copy.dataset.seriesEnter; };
    const onPreferenceChange = () => { if (media.matches) finish(); };
    if (shouldAnimateSeriesIntro(entranceRef.current.previous, category, media.matches)) {
      copy.dataset.seriesEnter = "true";
    }
    copy.addEventListener("animationend", finish);
    media.addEventListener("change", onPreferenceChange);

    return () => {
      finish();
      copy.removeEventListener("animationend", finish);
      media.removeEventListener("change", onPreferenceChange);
    };
  }, [category, history]);

  return (
    <span ref={copyRef} className={`series-intro-copy${description ? " series-intro-description" : ""}`}>
      {children}
    </span>
  );
}
