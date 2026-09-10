"use client";

import Image from "next/image";
import { useLayoutEffect, useState } from "react";
import { m as motion } from "framer-motion";
import { getLightboxExitTransition, getLightboxPhotoTransition, getLightboxTarget, observeLightboxPreview } from "../lib/lightbox-motion.mjs";

const getLightboxImageSizes = (img, portraitFrameRatio) => {
  const ratio = img.width / img.height;
  if (ratio > 1) return `(min-width: 768px) min(calc(100vw - 128px), calc(82dvh * ${ratio})), calc(100vw - 16px)`;
  if (ratio === 1) return "(min-width: 768px) min(calc(100vw - 128px), calc(82dvh - 115.5px)), calc(100vw - 16px)";

  // Match the frame's 288px minimum text column and responsive gap.
  const desktopSize = (gap) => `min(calc(82dvh * ${ratio}), calc((min(1152px, calc(100vw - 128px)) - ${288 + gap}px) * ${ratio / portraitFrameRatio}))`;
  return `(min-width: 1024px) ${desktopSize(56)}, (min-width: 768px) ${desktopSize(40)}, calc((100vw - 16px) * ${ratio / portraitFrameRatio})`;
};

export default function LightboxPhoto({ img, getThumbnail, shouldReduceMotion, onReady, portraitFrameRatio = 3 / 4 }) {
  const isPortrait = img.width < img.height;
  const [previewSrc, setPreviewSrc] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const ready = Boolean(previewSrc) || isLoaded;

  useLayoutEffect(() => observeLightboxPreview(getThumbnail(img.id)?.querySelector("img"), setPreviewSrc), [getThumbnail, img.id]);
  useLayoutEffect(() => {
    if (ready || hasError) onReady(true);
  }, [ready, hasError, onReady]);

  return (
    <motion.div
      className={`lightbox-photo relative w-full max-w-full ${isPortrait ? "lightbox-photo-portrait" : "lightbox-photo-stacked"}`}
      style={{ "--lightbox-photo-ratio": img.width / img.height }}
      aria-busy={!ready && !hasError}
      data-photo-ready={ready}
      initial={{ opacity: 0 }}
      animate={getLightboxTarget({ opacity: ready || hasError ? 1 : 0 }, shouldReduceMotion)}
      exit={{ opacity: 0, transition: getLightboxExitTransition({ layer: "photo", instant: shouldReduceMotion }) }}
      transition={getLightboxPhotoTransition({ instant: shouldReduceMotion })}
    >
      {previewSrc && !isLoaded && (
        // Keep the cached photograph visible while the larger file loads.
        <img src={previewSrc} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-contain" />
      )}
      <Image
        src={img.src}
        alt={img.title}
        width={img.width}
        height={img.height}
        sizes={getLightboxImageSizes(img, portraitFrameRatio)}
        priority
        draggable={false}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        style={{ opacity: isLoaded ? 1 : 0 }}
        className="h-auto w-full max-w-full object-contain"
      />
      {hasError && !ready && (
        <p role="status" className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-white/70">
          This photo couldn’t be loaded. Please try another photo.
        </p>
      )}
    </motion.div>
  );
}
