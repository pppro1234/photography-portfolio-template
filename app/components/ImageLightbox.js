"use client";

import { useReducedMotionPreference } from "./useReducedMotionPreference";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { m as motion, useIsPresent } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import LightboxPhoto from "./LightboxPhoto";
import { useLightboxScene } from "./useLightboxScene";
import { photoTitleClassName } from "../lib/gallery-presentation";
import { getLightboxExitTransition, getLightboxTarget, getLightboxTransition } from "../lib/lightbox-motion.mjs";
import { MOTION_BLUR, MOTION_DURATION, MOTION_EASE, motionBlur, motionRevealTransition, motionTransition } from "../lib/motion-tokens.mjs";

function LightboxContent({ img, getThumbnail, shouldReduceMotion }) {
  const [ready, setReady] = useState(false);
  const isWide = img.isWide;
  const textBlur = shouldReduceMotion ? "none" : motionBlur();
  const textBlock = (
    <motion.div
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 18, filter: textBlur }}
      animate={getLightboxTarget({ opacity: ready ? 1 : 0, y: shouldReduceMotion || ready ? 0 : 18, filter: ready ? "none" : textBlur }, shouldReduceMotion)}
      exit={{ opacity: 0, y: shouldReduceMotion ? 0 : 18, filter: textBlur, transition: getLightboxExitTransition({ layer: "detail", instant: shouldReduceMotion }) }}
      onClick={(event) => event.stopPropagation()}
      transition={motionRevealTransition(MOTION_DURATION.emphasis, { instant: shouldReduceMotion, delay: MOTION_DURATION.quick })}
      className={
        isWide
          ? "motion-blur-content w-full max-w-4xl px-3 text-center md:px-0 md:text-left"
          : "motion-blur-content w-full max-w-md px-3 text-center md:px-0 md:text-left"
      }
    >
      <h2
        id={`lightbox-title-${img.id}`}
        className={photoTitleClassName}
      >
        {img.title}
      </h2>
      <p id={`lightbox-description-${img.id}`} className="mt-4 font-sans text-base font-light leading-6 tracking-normal text-white/70">
        {img.description || img.category}
      </p>
    </motion.div>
  );

  return (
    <>
      <LightboxPhoto img={img} getThumbnail={getThumbnail} shouldReduceMotion={shouldReduceMotion} onReady={setReady} />
      {textBlock}
    </>
  );
}

const ImageLightbox = ({ img, onClose, onNavigate, canNavigate, returnFocusRef, getThumbnail }) => {
  const isWide = img.isWide;
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const touchStartRef = useRef(null);
  const isPresent = useIsPresent();
  const shouldReduceMotion = useReducedMotionPreference();
  const glyphMotion = {
    initial: { filter: shouldReduceMotion ? "none" : motionBlur(MOTION_BLUR.control) },
    animate: { ...getLightboxTarget({ filter: "none" }, shouldReduceMotion), transition: motionTransition(MOTION_DURATION.control, { instant: shouldReduceMotion, ease: MOTION_EASE.inOut }) },
    exit: {
      filter: shouldReduceMotion ? "none" : motionBlur(MOTION_BLUR.control),
      transition: getLightboxExitTransition({ layer: "detail", instant: shouldReduceMotion }),
    },
    transition: motionTransition(MOTION_DURATION.control, { instant: shouldReduceMotion }),
  };

  useLightboxScene({ returnFocusRef, closeButtonRef, shouldReduceMotion });

  useLayoutEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "instant" });
    touchStartRef.current = null;
  }, [img.id]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;

      if (event.key === "Escape" && isPresent) {
        event.preventDefault();
        onClose();
      } else if (isPresent && canNavigate && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        event.preventDefault();
        onNavigate(event.key === "ArrowLeft" ? -1 : 1);
      } else if (event.key === "Tab") {
        const buttons = dialogRef.current?.querySelectorAll("button:not(:disabled)");
        if (!buttons?.length) return;
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        const focusIsOutside = !dialogRef.current.contains(document.activeElement);

        if (event.shiftKey && (document.activeElement === first || focusIsOutside)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || focusIsOutside)) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onNavigate, canNavigate, isPresent]);

  const handleTouchStart = (event) => {
    // Let vertical scrolling and multi-touch zoom keep their native behavior.
    if (!isPresent || !canNavigate || event.touches.length !== 1) {
      touchStartRef.current = null;
      return;
    }
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, id: touch.identifier };
  };

  const handleTouchEnd = (event) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!isPresent || !start || event.touches.length > 0) return;
    const touch = Array.from(event.changedTouches).find((item) => item.identifier === start.id);
    if (!touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;

    if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      onNavigate(dx < 0 ? 1 : -1);
    }
  };


  return (
    <motion.div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`lightbox-title-${img.id}`}
      aria-describedby={`lightbox-description-${img.id}`}
      className="image-lightbox fixed inset-0 z-[100] text-white"
      onClick={() => { if (isPresent) onClose(); }}
    >
      <motion.div
        aria-hidden="true"
        className="image-lightbox-backdrop pointer-events-none absolute inset-0"
        initial={{ opacity: 0 }}
        animate={getLightboxTarget({ opacity: 1 }, shouldReduceMotion)}
        exit={{ opacity: 0, transition: getLightboxExitTransition({ instant: shouldReduceMotion }) }}
        transition={getLightboxTransition({ instant: shouldReduceMotion })}
      />
      <motion.button
        ref={closeButtonRef}
        type="button"
        aria-label="Close image preview"
        onClick={(event) => {
          event.stopPropagation();
          if (isPresent) onClose();
        }}
        className="lightbox-control fixed right-4 top-4 z-[110] grid size-11 place-items-center text-white/75 motion-color-feedback hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white md:right-8 md:top-8"
        initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.82 }}
        animate={getLightboxTarget({ opacity: 1, scale: 1 }, shouldReduceMotion)}
        exit={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.82, transition: getLightboxExitTransition({ layer: "detail", instant: shouldReduceMotion }) }}
        transition={motionTransition(MOTION_DURATION.control, { instant: shouldReduceMotion })}
      >
        <motion.span className="lightbox-control-glyph" {...glyphMotion}><X size={20} /></motion.span>
      </motion.button>

      {canNavigate && (
        <motion.nav
          aria-label="Photo navigation"
          className="pointer-events-none fixed inset-x-0 top-4 z-[110] flex justify-center gap-3 md:top-1/2 md:-translate-y-1/2 md:justify-between md:px-4"
          initial={{ opacity: 0 }}
          animate={getLightboxTarget({ opacity: 1 }, shouldReduceMotion)}
          exit={{ opacity: 0, transition: getLightboxExitTransition({ layer: "detail", instant: shouldReduceMotion }) }}
          transition={motionTransition(MOTION_DURATION.control, { instant: shouldReduceMotion })}
        >
          <button
            type="button"
            aria-label="Previous photo"
            aria-keyshortcuts="ArrowLeft"
            onClick={(event) => {
              event.stopPropagation();
              if (isPresent) onNavigate(-1);
            }}
            className="lightbox-control pointer-events-auto grid size-11 cursor-pointer place-items-center text-white/75 motion-color-feedback hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <motion.span className="lightbox-control-glyph" {...glyphMotion}><ChevronLeft size={22} aria-hidden="true" /></motion.span>
          </button>
          <button
            type="button"
            aria-label="Next photo"
            aria-keyshortcuts="ArrowRight"
            onClick={(event) => {
              event.stopPropagation();
              if (isPresent) onNavigate(1);
            }}
            className="lightbox-control pointer-events-auto grid size-11 cursor-pointer place-items-center text-white/75 motion-color-feedback hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <motion.span className="lightbox-control-glyph" {...glyphMotion}><ChevronRight size={22} aria-hidden="true" /></motion.span>
          </button>
        </motion.nav>
      )}

      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {img.title}
      </p>

      <div ref={scrollContainerRef} className="lightbox-scroll relative h-full w-full overflow-y-auto overscroll-contain px-2 pt-18 pb-8 md:px-16 md:py-12">
        <div
          className={
            isWide
              ? "flex min-h-full items-start justify-center md:pt-8"
              : "flex min-h-full items-start justify-center md:items-center"
          }
        >
          <div
            key={img.id}
            onClick={(event) => event.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchMove={(event) => {
              if (event.touches.length !== 1) touchStartRef.current = null;
            }}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={() => { touchStartRef.current = null; }}
            style={{ touchAction: "pan-y pinch-zoom" }}
            className={
              isWide
                ? "flex w-full max-w-6xl flex-col items-center gap-5 md:gap-6"
                : "flex w-full max-w-6xl flex-col items-center gap-6 md:flex-row md:items-center md:justify-center md:gap-10 lg:gap-14"
            }
          >
            <LightboxContent
              img={img}
              getThumbnail={getThumbnail}
              shouldReduceMotion={shouldReduceMotion}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ImageLightbox;
