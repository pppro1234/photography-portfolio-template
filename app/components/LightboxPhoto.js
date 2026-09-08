"use client";

import Image from "next/image";
import { useLayoutEffect, useState } from "react";
import { m as motion } from "framer-motion";
import { getLightboxExitTransition, getLightboxPhotoTransition, getLightboxTarget, observeLightboxPreview } from "../lib/lightbox-motion.mjs";

const getLightboxImageSizes = (img) =>
  img.isWide
    ? "(min-width: 768px) 90vw, 100vw"
    : "(min-width: 768px) 58vw, 100vw";

export default function LightboxPhoto({ img, getThumbnail, shouldReduceMotion, onReady }) {
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
      className="lightbox-photo relative w-full max-w-full md:w-auto"
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
        sizes={getLightboxImageSizes(img)}
        priority
        draggable={false}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        style={{ opacity: isLoaded ? 1 : 0 }}
        className={
          img.isWide
            ? "h-auto w-full max-w-full object-contain md:max-h-[64vh] md:w-auto"
            : "h-auto w-full max-w-full object-contain md:max-h-[82vh] md:w-auto md:max-w-[58vw]"
        }
      />
      {hasError && !ready && (
        <p role="status" className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-white/70">
          This photo couldn’t be loaded. Please try another photo.
        </p>
      )}
    </motion.div>
  );
}
