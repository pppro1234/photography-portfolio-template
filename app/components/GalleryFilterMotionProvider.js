"use client";

import { createContext, useContext, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { isGalleryCategoryPath } from "../lib/gallery-filter-motion.mjs";

const GalleryFilterMotionContext = createContext(null);

export function useGalleryFilterHistory() {
  return useContext(GalleryFilterMotionContext);
}

export default function GalleryFilterMotionProvider({ children }) {
  const history = useRef(null);
  const pathname = usePathname();

  useLayoutEffect(() => {
    // The homepage has no filter bar; never replay an old selection when
    // returning from it, About, or an unknown route.
    if (!isGalleryCategoryPath(pathname)) history.current = null;
  }, [pathname]);

  return <GalleryFilterMotionContext.Provider value={history}>{children}</GalleryFilterMotionContext.Provider>;
}
