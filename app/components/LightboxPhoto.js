"use client";

import Image from "next/image";
import { useLayoutEffect, useState } from "react";
import { m as motion } from "framer-motion";
import { getLightboxExitTransition } from "../lib/lightbox-motion.mjs";
import { MOTION_DURATION, motionTransition } from "../lib/motion-tokens.mjs";

const getLightboxImageSizes = (img) =>
  img.isWide
    ? "(min-width: 768px) 90vw, 100vw"
    : "(min-width: 768px) 58vw, 100vw";

export default function LightboxPhoto({ img, getThumbnail, shouldReduceMotion }) {
  const [previewSrc, setPreviewSrc] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useLayoutEffect(() => {
    const thumbnailImage = getThumbnail(img.id)?.querySelector("img");
    if (thumbnailImage?.complete && thumbnailImage.naturalWidth > 0) {
      setPreviewSrc(thumbnailImage.currentSrc || thumbnailImage.src);
    }
  }, [getThumbnail, img.id]);

  return (
    <motion.div
      className="relative w-full max-w-full md:w-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: getLightboxExitTransition({ layer: "photo", instant: shouldReduceMotion }) }}
      transition={motionTransition(MOTION_DURATION.control, { instant: shouldReduceMotion })}
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
        className={
          img.isWide
            ? "h-auto w-full max-w-full object-contain md:max-h-[64vh] md:w-auto"
            : "h-auto w-full max-w-full object-contain md:max-h-[82vh] md:w-auto md:max-w-[58vw]"
        }
      />
    </motion.div>
  );
}
