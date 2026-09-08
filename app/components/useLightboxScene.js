"use client";

import { useLayoutEffect, useRef } from "react";
import { usePresence } from "framer-motion";
import { freezeLightboxScene, getLightboxTransition, LIGHTBOX_DEPTH_SCALE } from "../lib/lightbox-motion.mjs";

export function useLightboxScene({ returnFocusRef, closeButtonRef, shouldReduceMotion }) {
  const [isPresent, safeToRemove] = usePresence();
  const sceneRef = useRef(null);
  const animationRef = useRef(null);

  useLayoutEffect(() => {
    const { body, documentElement } = document;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const previousFocus = returnFocusRef.current || document.activeElement;
    const scroll = { left: window.scrollX, top: window.scrollY };
    const pathname = window.location.pathname;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
    const content = document.getElementById("site-content");
    const scene = document.getElementById("site-scene");
    const previousInert = scene?.inert;

    if (scrollbarWidth > 0) {
      const padding = parseFloat(window.getComputedStyle(body).paddingRight) || 0;
      body.style.paddingRight = `${padding + scrollbarWidth}px`;
    }
    body.style.overflow = "hidden";
    closeButtonRef.current?.focus({ preventScroll: true });
    if (scene) scene.inert = true;

    const frozen = freezeLightboxScene({
      stage: document.getElementById("site-stage"), scene, content,
      scrollY: scroll.top, viewportHeight: window.innerHeight, scrollbarWidth,
      contentMarginTop: content ? parseFloat(window.getComputedStyle(content).marginTop) || 0 : 0,
    });
    sceneRef.current = frozen?.scene || null;
    const resize = () => frozen?.updateViewport(window.innerHeight);
    window.addEventListener("resize", resize);

    return () => {
      animationRef.current?.cancel();
      window.removeEventListener("resize", resize);
      frozen?.restore();
      if (scene) scene.inert = previousInert;
      sceneRef.current = null;
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
      // Route changes own scroll restoration; closing keeps the overview in
      // place, including after a viewport resize while the lightbox was open.
      if (window.location.pathname === pathname) {
        window.scrollTo({ ...scroll, behavior: "instant" });
        if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
          previousFocus.focus({ preventScroll: true });
        }
      }
      window.dispatchEvent(new Event("lightbox:restore"));
    };
  }, [closeButtonRef, returnFocusRef]);

  useLayoutEffect(() => {
    const scene = sceneRef.current;
    if (!scene) {
      if (!isPresent) safeToRemove?.();
      return;
    }
    let cancelled = false;
    const from = window.getComputedStyle(scene).transform;
    animationRef.current?.cancel();
    const target = `scale(${isPresent && !shouldReduceMotion ? LIGHTBOX_DEPTH_SCALE : 1})`;
    scene.style.transform = target;

    if (shouldReduceMotion || typeof scene.animate !== "function") {
      if (!isPresent) safeToRemove?.();
      return;
    }

    const transition = getLightboxTransition({ isPresent });
    const animation = scene.animate([{ transform: from }, { transform: target }], {
      duration: transition.duration * 1000,
      delay: transition.delay * 1000,
      easing: `cubic-bezier(${transition.ease.join(",")})`,
      // Hold the sampled scale during the exit delay, before the inline target.
      fill: "backwards",
    });
    animationRef.current = animation;
    animation.finished.then(() => {
      if (!cancelled && !isPresent) safeToRemove?.();
    }, () => {});

    // Sample the in-flight transform before cancelling in the next effect so
    // an early close reverses from the current visual position.
    return () => { cancelled = true; };
  }, [isPresent, safeToRemove, shouldReduceMotion]);
}
