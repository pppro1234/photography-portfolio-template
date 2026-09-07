"use client";

import { useEffect, useRef, useState } from "react";
import { m as motion, useInView, useReducedMotion } from "framer-motion";
import { getAboutRevealAnimation } from "../lib/about-motion.mjs";

const elements = { div: motion.div, p: motion.p, h1: motion.h1, h2: motion.h2, figure: motion.figure, nav: motion.nav };

export default function AboutReveal({ as = "div", order = 0, media = false, className = "", children, ...props }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.12 });
  const reduceMotion = useReducedMotion();
  const [mediaReady, setMediaReady] = useState(!media);
  const [focused, setFocused] = useState(false);
  const animation = getAboutRevealAnimation({ order, media, instant: reduceMotion || focused });
  const Element = elements[as];

  useEffect(() => {
    if (!media) return;
    const img = ref.current?.querySelector("img");
    // Cached images may finish before hydration; failed images must not hide captions.
    if (!img || img.complete) {
      setMediaReady(true);
      return;
    }
    const ready = () => setMediaReady(true);
    img.addEventListener("load", ready, { once: true });
    img.addEventListener("error", ready, { once: true });
    return () => {
      img.removeEventListener("load", ready);
      img.removeEventListener("error", ready);
    };
  }, [media]);

  return (
    <Element {...props} ref={ref} className={`about-reveal ${className}`} data-reveal-order={order}
      data-reveal-focused={focused ? "" : undefined}
      initial={reduceMotion ? false : "hidden"}
      animate={reduceMotion || focused || (inView && mediaReady) ? "visible" : "hidden"}
      variants={{ hidden: animation.hidden, visible: animation.visible }} transition={animation.transition}
      onFocusCapture={() => setFocused(true)}>
      {children}
    </Element>
  );
}
