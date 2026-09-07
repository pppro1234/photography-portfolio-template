"use client";

import { createContext, useContext, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { clampProgress, collapseEasing, getBrandTransform, getIntroGeometry, getNavigationReveal, INTRO_SPRING, smoothStep } from "../lib/intro-motion.mjs";
import { MOTION_BLUR, motionBlur } from "../lib/motion-tokens.mjs";

const IntroMotionContext = createContext(null);

export function useIntroMotion() {
  return useContext(IntroMotionContext);
}

export default function IntroMotionProvider({ children }) {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const shouldReduceMotion = useReducedMotion();
  const smoothScroll = useSpring(scrollY, INTRO_SPRING);
  const menuProgress = useMotionValue(0);
  const smoothMenu = useSpring(menuProgress, INTRO_SPRING);
  const geometry = useMotionValue(getIntroGeometry({ originTop: 144, originLeft: 32, availableScroll: 184 }));
  const activeScroll = shouldReduceMotion ? scrollY : smoothScroll;
  const activeMenu = shouldReduceMotion ? menuProgress : smoothMenu;

  const navigationOpacity = useTransform([activeScroll, geometry, activeMenu], ([scroll, bounds, menu]) =>
    getNavigationReveal(scroll, bounds, menu)
  );
  const navigationY = useTransform(navigationOpacity, (progress) => 4 * (1 - progress));
  const navigationBlur = useTransform(navigationOpacity, (progress) => motionBlur(MOTION_BLUR.content, 1 - progress));
  const navigationVisibility = useTransform(navigationOpacity, (progress) => progress > 0 ? "visible" : "hidden");
  const navigationInteractive = useTransform(navigationOpacity, (progress) => progress >= 0.5);
  const navigationPointerEvents = useTransform(navigationInteractive, (interactive) => interactive ? "auto" : "none");

  const brandTransform = useTransform([activeScroll, geometry, activeMenu], ([scroll, bounds, menu]) => {
    const { x, y, scale } = getBrandTransform(scroll, bounds, menu);
    return `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
  });
  const titleTransform = useTransform([activeScroll, geometry], ([scroll, bounds]) => {
    const progress = collapseEasing(scroll, bounds.distance);
    const y = bounds.originTop + (20 - bounds.originTop) * progress;
    return `translate3d(0, ${y}px, 0) scale(${1 + (bounds.scale - 1) * progress})`;
  });
  const subtitleOpacity = useTransform([activeScroll, geometry], ([scroll, bounds]) =>
    1 - smoothStep(clampProgress((scroll / bounds.distance - 0.04) / 0.52))
  );
  const subtitleY = useTransform([activeScroll, geometry], ([scroll, bounds]) =>
    -8 * clampProgress(scroll / bounds.distance / 0.6)
  );
  const subtitleBlur = useTransform([activeScroll, geometry], ([scroll, bounds]) =>
    motionBlur(MOTION_BLUR.content, clampProgress(scroll / bounds.distance / 0.6))
  );
  const surfaceOpacity = useTransform([activeScroll, geometry, activeMenu], ([scroll, bounds, menu]) =>
    bounds.scrollable === false ? 1 : Math.max(smoothStep(clampProgress((scroll / bounds.distance - 0.4) / 0.6)), clampProgress(menu))
  );

  useLayoutEffect(() => {
    let cancelled = false;
    const sync = () => {
      if (cancelled) return;
      const currentScroll = Math.max(0, window.scrollY);
      const origin = document.getElementById("intro-origin");
      if (origin) {
        const bounds = origin.getBoundingClientRect();
        const slot = document.querySelector(".site-nav-brand-slot")?.getBoundingClientRect();
        geometry.set(getIntroGeometry({
          originTop: bounds.top + currentScroll,
          originLeft: bounds.left,
          slotTop: slot?.top ?? 0,
          slotLeft: slot?.left ?? bounds.left,
          navHeight: slot?.height ?? 44,
          desktop: window.matchMedia("(min-width: 768px)").matches,
          availableScroll: document.documentElement.scrollHeight - window.innerHeight,
        }));
      }
      scrollY.set(currentScroll);
      // Measure restored routes in place, without replaying their entrance.
      smoothScroll.jump(currentScroll);
    };
    sync();
    const frame = window.requestAnimationFrame(sync);
    const observer = new ResizeObserver(sync);
    observer.observe(document.body);
    for (const element of [document.getElementById("intro-origin"), document.querySelector(".site-nav-brand-slot")]) {
      if (element) observer.observe(element);
    }
    document.fonts.ready.then(sync);
    window.addEventListener("resize", sync);
    window.addEventListener("pageshow", sync);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", sync);
      window.removeEventListener("pageshow", sync);
    };
  }, [pathname, geometry, scrollY, smoothScroll]);

  return (
    <IntroMotionContext.Provider value={{ brandTransform, titleTransform, subtitleOpacity, subtitleY, subtitleBlur, surfaceOpacity, navigationOpacity, navigationY, navigationBlur, navigationVisibility, navigationInteractive, navigationPointerEvents, menuProgress, shouldReduceMotion }}>
      {children}
    </IntroMotionContext.Provider>
  );
}
