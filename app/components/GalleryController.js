"use client";

import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import ImageLightbox from "./ImageLightbox";
import { useNearViewport, usePageVisible } from "./useMotionActivity";
import { useSpringCleanup } from "./useSpringCleanup";
import { MOTION_SPRING } from "../lib/motion-tokens.mjs";

const GalleryContext = createContext(null);

export const useGalleryMotion = () => useContext(GalleryContext);

// Only mounted while the gallery is near the viewport and the tab is visible.
function GalleryScrollMotion({ floatProgress, floatScale, lightboxActiveRef }) {
  const { scrollY } = useScroll();
  const laggedScroll = useSpring(scrollY, MOTION_SPRING.galleryScroll);
  useSpringCleanup(laggedScroll);
  const progress = useTransform(
    [scrollY, laggedScroll],
    ([scroll, lagged]) => Math.max(-1, Math.min(1, (scroll - lagged) / 80))
  );

  useLayoutEffect(() => {
    const syncScroll = () => {
      const currentScroll = Math.max(0, window.scrollY);
      floatScale.set(window.matchMedia("(min-width: 1024px)").matches ? 1.8 : 1);
      scrollY.set(currentScroll);
      laggedScroll.jump(currentScroll);
      floatProgress.set(0);
    };
    syncScroll();
    const unsubscribe = progress.on("change", (value) => floatProgress.set(value));
    window.addEventListener("pageshow", syncScroll);
    window.addEventListener("resize", syncScroll);
    return () => {
      unsubscribe();
      if (!lightboxActiveRef.current) floatProgress.set(0);
      window.removeEventListener("pageshow", syncScroll);
      window.removeEventListener("resize", syncScroll);
    };
  }, [scrollY, laggedScroll, progress, floatProgress, floatScale, lightboxActiveRef]);

  return null;
}

export default function GalleryController({ images, children }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [isLightboxActive, setIsLightboxActive] = useState(false);
  const lightboxActiveRef = useRef(false);
  const sectionRef = useRef(null);
  const returnFocusRef = useRef(null);
  const isNearViewport = useNearViewport(sectionRef);
  const isPageVisible = usePageVisible();
  const shouldReduceMotion = useReducedMotion();
  const floatProgress = useMotionValue(0);
  const floatScale = useMotionValue(1);
  const imagesById = useMemo(() => new Map(images.map((img) => [img.id, img])), [images]);
  const openLightbox = useCallback((id, trigger) => {
    const image = imagesById.get(id);
    if (!image) return;
    returnFocusRef.current = trigger;
    lightboxActiveRef.current = true;
    setIsLightboxActive(true);
    setSelectedImage(image);
  }, [imagesById]);
  const closeLightbox = useCallback(() => setSelectedImage(null), []);
  const finishLightbox = useCallback(() => {
    lightboxActiveRef.current = false;
    setIsLightboxActive(false);
  }, []);
  const getThumbnail = useCallback((id) => {
    const thumbnails = sectionRef.current?.querySelectorAll("[data-photo-id]");
    return Array.from(thumbnails || []).find((thumbnail) => thumbnail.dataset.photoId === String(id)) || null;
  }, []);
  const navigateLightbox = useCallback((direction) => {
    setSelectedImage((currentImage) => {
      if (!currentImage || images.length < 2) return currentImage;
      const currentIndex = images.findIndex((image) => image.id === currentImage.id);
      return images[(currentIndex + direction + images.length) % images.length];
    });
  }, [images]);
  const context = useMemo(() => ({
    floatProgress, floatScale, openLightbox, isPageVisible: isPageVisible && !isLightboxActive, shouldReduceMotion,
  }), [floatProgress, floatScale, openLightbox, isPageVisible, isLightboxActive, shouldReduceMotion]);

  return (
    <GalleryContext.Provider value={context}>
      {isNearViewport && isPageVisible && !isLightboxActive && !shouldReduceMotion && (
        <GalleryScrollMotion floatProgress={floatProgress} floatScale={floatScale} lightboxActiveRef={lightboxActiveRef} />
      )}
      <section ref={sectionRef} aria-label="Selected photographs" className="gallery-layout w-full max-w-[1400px] mx-auto px-4 md:px-8 pb-16 md:pb-24">
        {children}
      </section>
      {isLightboxActive && createPortal(<AnimatePresence onExitComplete={finishLightbox}>
        {selectedImage && (
          <ImageLightbox
            img={selectedImage}
            onClose={closeLightbox}
            onNavigate={navigateLightbox}
            canNavigate={images.length > 1}
            returnFocusRef={returnFocusRef}
            getThumbnail={getThumbnail}
          />
        )}
      </AnimatePresence>, document.body)}
    </GalleryContext.Provider>
  );
}
