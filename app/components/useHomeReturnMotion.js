"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { animate, useMotionValue, useTransform } from "framer-motion";
import { isGalleryCategoryPath } from "../lib/gallery-filter-motion.mjs";
import { MOTION_BLUR, MOTION_DELAY, MOTION_DURATION, motionBlur, motionTransition } from "../lib/motion-tokens.mjs";

// Only an explicit home link starts this transition. History restoration keeps
// its scroll position and the ordinary scroll-driven wordmark.
export default function useHomeReturnMotion({ pathname, shouldReduceMotion, scrollY, smoothScroll, menuProgress, smoothMenu }) {
  const [request, setRequest] = useState(null);
  const sequence = useRef(0);
  const animation = useRef(null);
  const completion = useRef(null);
  const navigationExit = useMotionValue(0);
  const navigationExitBlur = useTransform(navigationExit, (opacity) => motionBlur(MOTION_BLUR.control, 1 - opacity));
  const isHomeReturn = pathname === "/" && request !== null;
  const homeReturnPhase = isHomeReturn && !shouldReduceMotion ? request.phase : "idle";

  const stop = useCallback(() => {
    animation.current?.stop();
    animation.current = null;
    window.clearTimeout(completion.current);
    completion.current = null;
  }, []);

  const finishHomeReturn = useCallback(() => {
    stop();
    // The closing menu must not restart the wordmark's vertical journey.
    smoothMenu.jump(menuProgress.get());
    navigationExit.set(0);
    setRequest(null);
  }, [stop, smoothMenu, menuProgress, navigationExit]);

  const prepareHomeReturn = useCallback((href) => {
    if (href === "/" && isGalleryCategoryPath(pathname)) {
      stop();
      navigationExit.set(1);
      setRequest({ id: ++sequence.current, from: pathname, phase: "pending" });
    } else if (request) {
      finishHomeReturn();
    }
  }, [pathname, request, stop, navigationExit, finishHomeReturn]);

  useLayoutEffect(() => {
    if (!request || pathname === request.from) return;
    if (pathname !== "/") {
      finishHomeReturn();
      return;
    }
    // Native Link scroll handling may retain a still-visible page. Explicit
    // home navigation lands at the title, without animating the page scroll.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    scrollY.set(0);
    smoothScroll.jump(0);
    if (shouldReduceMotion) {
      menuProgress.set(0);
      finishHomeReturn();
    } else {
      setRequest((current) => current && { ...current, phase: "waiting" });
    }
    // Phase changes do not repeat the scroll reset.
  }, [pathname, request?.id, scrollY, smoothScroll, shouldReduceMotion, menuProgress, finishHomeReturn]);

  const startHomeReturn = useCallback(() => {
    if (homeReturnPhase !== "waiting") return;
    smoothMenu.jump(0);
    setRequest((current) => current && { ...current, phase: "revealing" });
    animation.current = animate(navigationExit, 0, motionTransition(MOTION_DURATION.control));
    completion.current = window.setTimeout(finishHomeReturn, MOTION_DURATION.surface + MOTION_DELAY.paragraph);
  }, [homeReturnPhase, smoothMenu, navigationExit, finishHomeReturn]);

  useLayoutEffect(() => {
    if (!request) return;
    const onScroll = () => {
      if (pathname === "/" && window.scrollY > 0) finishHomeReturn();
    };
    const onVisibility = () => { if (document.hidden) finishHomeReturn(); };
    window.addEventListener("popstate", finishHomeReturn);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("popstate", finishHomeReturn);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pathname, request?.id, finishHomeReturn]);

  useLayoutEffect(() => stop, [stop]);

  return { isHomeReturn, homeReturnPhase, prepareHomeReturn, startHomeReturn, navigationExit, navigationExitBlur };
}
