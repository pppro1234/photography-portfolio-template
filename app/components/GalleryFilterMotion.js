"use client";

import { useLayoutEffect, useRef } from "react";
import { animate, m, useMotionValue } from "framer-motion";
import { useGalleryFilterHistory } from "./GalleryFilterMotionProvider";
import { getFilterBounds, getFilterMotionStart, getFilterScrollLeft } from "../lib/gallery-filter-motion.mjs";
import { MOTION_DURATION, motionTransition } from "../lib/motion-tokens.mjs";

export default function GalleryFilterMotion({ activeCategory, children }) {
  const navRef = useRef(null);
  const trackRef = useRef(null);
  const history = useGalleryFilterHistory();
  const entranceRef = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const width = useMotionValue(0);

  useLayoutEffect(() => {
    const nav = navRef.current;
    const track = trackRef.current;
    const active = track.querySelector('[aria-current="page"]');
    if (!active) return;
    const label = active.firstElementChild;
    // Capture after the outgoing route's cleanup, not during render. Reuse
    // this origin when development Strict Mode replays the mount effects.
    if (!entranceRef.current || entranceRef.current.category !== activeCategory) {
      entranceRef.current = { category: activeCategory, previous: history.current };
    }
    const previous = entranceRef.current.previous;
    const previousLink = [...track.querySelectorAll("[data-category]")]
      .find((link) => link.dataset.category === previous?.category);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const measure = (element) => getFilterBounds(element.getBoundingClientRect(), track.getBoundingClientRect());
    let target = measure(label);
    let disposed = false;
    const start = getFilterMotionStart(previous, {
      category: activeCategory,
      trackWidth: track.offsetWidth,
      target,
      previousTarget: previousLink ? measure(previousLink.firstElementChild) : null,
      reducedMotion: media.matches,
    });
    x.set(start.x);
    width.set(start.width);
    y.set(target.y);
    nav.scrollLeft = getFilterScrollLeft({
      scrollLeft: previous?.scrollLeft ?? nav.scrollLeft,
      viewportWidth: nav.clientWidth,
      scrollWidth: nav.scrollWidth,
      target,
    });
    nav.dataset.motionReady = "true";
    const transition = motionTransition(MOTION_DURATION.surface, { instant: media.matches });
    const animations = [animate(x, target.x, transition), animate(width, target.width, transition)];
    if (previousLink && previous.category !== activeCategory && !media.matches) {
      previousLink.dataset.motionFrom = "true";
      active.dataset.motionTo = "true";
    }

    const sync = () => {
      if (disposed) return;
      const next = measure(label);
      if (!media.matches && next.x === target.x && next.y === target.y && next.width === target.width) return;
      animations.forEach((animation) => animation.stop());
      target = next;
      x.set(next.x);
      y.set(next.y);
      width.set(next.width);
    };
    const observer = new ResizeObserver(sync);
    observer.observe(track);
    observer.observe(nav);
    observer.observe(label);
    document.fonts.ready.then(sync);
    document.fonts.addEventListener("loadingdone", sync);
    media.addEventListener("change", sync);

    return () => {
      disposed = true;
      // Keep the live position, not just the previous destination, so rapid
      // route changes continue smoothly without changing gallery state.
      history.current = {
        category: activeCategory,
        bounds: { x: x.get(), y: y.get(), width: width.get() },
        trackWidth: track.offsetWidth,
        scrollLeft: nav.scrollLeft,
      };
      animations.forEach((animation) => animation.stop());
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", sync);
      media.removeEventListener("change", sync);
      delete nav.dataset.motionReady;
      delete active.dataset.motionTo;
      if (previousLink) delete previousLink.dataset.motionFrom;
    };
  }, [activeCategory, history, width, x, y]);

  return (
    <nav ref={navRef} aria-label="Filter photographs" className="gallery-filters">
      <div ref={trackRef} className="gallery-filter-track">
        {children}
        <m.span aria-hidden="true" className="gallery-filter-indicator" style={{ x, y, width }} />
      </div>
    </nav>
  );
}
