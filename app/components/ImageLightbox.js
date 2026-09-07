"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef } from "react";
import { m as motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { photoTitleClassName } from "../lib/gallery-presentation";
import { MOTION_DURATION, MOTION_SPRING, motionTransition } from "../lib/motion-tokens.mjs";

const getLightboxImageSizes = (img) =>
  img.isWide
    ? "(min-width: 768px) 90vw, 100vw"
    : "(min-width: 768px) 58vw, 100vw";

const ImageLightbox = ({ img, onClose, onNavigate, canNavigate, returnFocusRef }) => {
  const isWide = img.isWide;
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const touchStartRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = returnFocusRef.current || document.activeElement;

    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus({ preventScroll: true });

    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [returnFocusRef]);

  useLayoutEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "instant" });
    touchStartRef.current = null;
  }, [img.id]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;

      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (canNavigate && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
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
  }, [onClose, onNavigate, canNavigate]);

  const handleTouchStart = (event) => {
    // Let vertical scrolling and multi-touch zoom keep their native behavior.
    if (!canNavigate || event.touches.length !== 1) {
      touchStartRef.current = null;
      return;
    }
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, id: touch.identifier };
  };

  const handleTouchEnd = (event) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || event.touches.length > 0) return;
    const touch = Array.from(event.changedTouches).find((item) => item.identifier === start.id);
    if (!touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;

    if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      onNavigate(dx < 0 ? 1 : -1);
    }
  };

  const textBlock = (
    <motion.div
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: shouldReduceMotion ? 0 : 10, transition: motionTransition(MOTION_DURATION.control, { instant: shouldReduceMotion }) }}
      onClick={(event) => event.stopPropagation()}
      transition={motionTransition(MOTION_DURATION.emphasis, { instant: shouldReduceMotion, delay: MOTION_DURATION.quick })}
      className={
        isWide
          ? "w-full max-w-4xl px-3 text-center md:px-0 md:text-left"
          : "w-full max-w-md px-3 text-center md:px-0 md:text-left"
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
    <motion.div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`lightbox-title-${img.id}`}
      aria-describedby={`lightbox-description-${img.id}`}
      className="fixed inset-0 z-[100] bg-black/75 text-white backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: motionTransition(MOTION_DURATION.control, { instant: shouldReduceMotion }) }}
      transition={motionTransition(MOTION_DURATION.surface, { instant: shouldReduceMotion })}
      onClick={onClose}
    >
      <motion.button
        ref={closeButtonRef}
        type="button"
        aria-label="Close image preview"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        className="fixed right-4 top-4 z-[110] grid size-11 place-items-center text-white/75 motion-color-feedback hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white md:right-8 md:top-8"
        initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.82 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.82 }}
        transition={motionTransition(MOTION_DURATION.control, { instant: shouldReduceMotion })}
      >
        <X size={20} />
      </motion.button>

      {canNavigate && (
        <nav
          aria-label="Photo navigation"
          className="pointer-events-none fixed inset-x-0 top-4 z-[110] flex justify-center gap-3 md:top-1/2 md:-translate-y-1/2 md:justify-between md:px-4"
        >
          <button
            type="button"
            aria-label="Previous photo"
            aria-keyshortcuts="ArrowLeft"
            onClick={(event) => {
              event.stopPropagation();
              onNavigate(-1);
            }}
            className="pointer-events-auto grid size-11 cursor-pointer place-items-center text-white/75 motion-color-feedback hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            aria-keyshortcuts="ArrowRight"
            onClick={(event) => {
              event.stopPropagation();
              onNavigate(1);
            }}
            className="pointer-events-auto grid size-11 cursor-pointer place-items-center text-white/75 motion-color-feedback hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <ChevronRight size={22} aria-hidden="true" />
          </button>
        </nav>
      )}

      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {img.title}
      </p>

      <div ref={scrollContainerRef} className="h-full w-full overflow-y-auto overscroll-contain px-2 pt-18 pb-8 md:px-16 md:py-12">
        <div
          className={
            isWide
              ? "flex min-h-full items-start justify-center md:pt-8"
              : "flex min-h-full items-start justify-center md:items-center"
          }
        >
          <motion.div
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={motionTransition(MOTION_DURATION.control, { instant: shouldReduceMotion })}
          >
            <motion.div
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-full md:w-auto"
              initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.92, transition: { type: "tween", ...motionTransition(MOTION_DURATION.control, { instant: shouldReduceMotion }) } }}
              transition={shouldReduceMotion ? { type: "tween", duration: 0 } : { type: "spring", ...MOTION_SPRING.lightbox }}
            >
              <Image
                src={img.src}
                alt={img.title}
                width={img.width}
                height={img.height}
                sizes={getLightboxImageSizes(img)}
                priority
                draggable={false}
                className={
                  isWide
                    ? "h-auto w-full max-w-full object-contain md:max-h-[64vh] md:w-auto"
                    : "h-auto w-full max-w-full object-contain md:max-h-[82vh] md:w-auto md:max-w-[58vw]"
                }
              />
            </motion.div>
            {textBlock}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default ImageLightbox;
