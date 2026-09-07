"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { m as motion, useAnimationControls, useMotionValue, useScroll, useSpring, useTransform } from "framer-motion";
import { getCardScrollProgress } from "../lib/near-viewport.mjs";
import { useGalleryMotion } from "./GalleryController";
import { useNearViewport } from "./useMotionActivity";
import { useSpringCleanup } from "./useSpringCleanup";
import { MOTION_DELAY, MOTION_DURATION, MOTION_SPRING, motionTransition } from "../lib/motion-tokens.mjs";

// Unmounting this controller removes offscreen scroll/transform subscriptions.
// The card and its rendered MotionValues stay mounted, so layout never changes.
function CardParallax({ cardRef, floatProgress, floatScale, floatDistance, cardY, imageY }) {
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start end", "end start"],
  });
  const floatingY = useTransform(
    [floatProgress, floatScale],
    ([progress, scale]) => progress * scale * floatDistance
  );
  const imageOffset = useTransform(scrollYProgress, [0, 1], [-2, 2]);
  const smoothImageOffset = useSpring(imageOffset, MOTION_SPRING.parallax);
  useSpringCleanup(smoothImageOffset);
  const parallaxY = useTransform(smoothImageOffset, (value) => `${value}%`);

  useLayoutEffect(() => {
    const syncPosition = () => {
      if (!cardRef.current) return;
      const progress = getCardScrollProgress(cardRef.current, Math.max(0, window.scrollY), window.innerHeight);
      scrollYProgress.set(progress);
      smoothImageOffset.jump(-2 + 4 * progress);
      imageY.set(`${smoothImageOffset.get()}%`);
      cardY.set(floatProgress.get() * floatScale.get() * floatDistance);
    };
    syncPosition();
    const stopFloat = floatingY.on("change", (value) => cardY.set(value));
    const stopParallax = parallaxY.on("change", (value) => imageY.set(value));
    window.addEventListener("pageshow", syncPosition);
    return () => {
      stopFloat();
      stopParallax();
      window.removeEventListener("pageshow", syncPosition);
    };
  }, [cardRef, cardY, imageY, floatProgress, floatScale, floatDistance, scrollYProgress, smoothImageOffset, floatingY, parallaxY]);

  return null;
}

export default function GalleryCardMotion({ id, title, isWide, index, children, caption }) {
  const cardRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const revealControls = useAnimationControls();
  const isNearViewport = useNearViewport(cardRef);
  const { floatProgress, floatScale, openLightbox, isPageVisible, shouldReduceMotion } = useGalleryMotion();
  const cardY = useMotionValue(0);
  const imageY = useMotionValue("-2%");
  const isActive = isPageVisible && !shouldReduceMotion && (isNearViewport || isFocused);
  const floatDistance = isWide ? 6 : index % 2 === 1 ? 10 : 8;

  return (
    <motion.div
      ref={cardRef}
      className={`gallery-reveal gallery-card ${isWide ? "gallery-card-wide" : ""}`}
      data-motion-active={isActive ? "true" : undefined}
      initial={shouldReduceMotion ? false : "hidden"}
      animate={revealControls}
      whileInView="visible"
      viewport={{ once: true, amount: 0.1, margin: "0px 0px -24px 0px" }}
      variants={{
        hidden: { opacity: 0, y: 24 },
        visible: {
          opacity: 1,
          y: 0,
          transition: motionTransition(MOTION_DURATION.content, {
            instant: shouldReduceMotion,
            delay: Math.min(index, 5) * MOTION_DELAY.paragraph,
          }),
        },
      }}
      onFocusCapture={() => {
        setIsFocused(true);
        revealControls.stop();
        revealControls.set({ opacity: 1, y: 0 });
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsFocused(false);
      }}
    >
      {isActive && (
        <CardParallax
          cardRef={cardRef}
          floatProgress={floatProgress}
          floatScale={floatScale}
          floatDistance={floatDistance}
          cardY={cardY}
          imageY={imageY}
        />
      )}
      <motion.button
        type="button"
        aria-label={`Open ${title}`}
        onClick={(event) => openLightbox(id, event.currentTarget)}
        style={{ y: shouldReduceMotion ? 0 : cardY }}
        className="gallery-card-button group relative block h-full w-full min-h-0 min-w-0 overflow-hidden text-left cursor-zoom-in"
      >
        <motion.div className="gallery-image" style={{ y: shouldReduceMotion ? 0 : imageY }}>
          {children}
        </motion.div>
        {caption}
      </motion.button>
    </motion.div>
  );
}
