"use client";

import { useLayoutEffect, useMemo, useState } from "react";
import { getGalleryLayout } from "../lib/gallery-layout.mjs";

export function useGalleryLayout(sectionRef, images) {
  const [columns, setColumns] = useState(null);
  useLayoutEffect(() => {
    const grid = sectionRef.current?.querySelector(".gallery-grid");
    if (!grid) return;
    let disposed = false;
    const syncColumns = () => {
      if (disposed || !grid.clientWidth || document.getElementById("site-scene")?.hasAttribute("data-lightbox-scene")) return;
      // Read the browser's resolved tracks, including empty auto-fill tracks.
      // The scaled lightbox scene must never change the gallery's layout.
      const tracks = getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/);
      if (tracks.every((track) => /^\d+(?:\.\d+)?px$/.test(track))) {
        setColumns((previous) => previous === tracks.length ? previous : tracks.length);
      }
    };
    syncColumns();
    const observer = new ResizeObserver(syncColumns);
    observer.observe(grid);
    window.addEventListener("lightbox:restore", syncColumns);
    return () => {
      disposed = true;
      observer.disconnect();
      window.removeEventListener("lightbox:restore", syncColumns);
    };
  }, [sectionRef]);

  return useMemo(() => {
    const layout = getGalleryLayout(images, columns);
    return {
      columnSpansById: new Map(images.map(({ id }, index) => [id, layout[index].span])),
      indicesInRowById: new Map(images.map(({ id }, index) => [id, layout[index].indexInRow])),
      // A preceding square can move a card without changing that card's size.
      // Refresh every active parallax controller after a new row arrangement.
      layoutSignature: `${columns}:${images.map(({ id }, index) => `${id}/${layout[index].span}`).join(",")}`,
    };
  }, [images, columns]);
}
