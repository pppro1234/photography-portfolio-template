"use client";

import Image from "next/image";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import images from "./gallery-data.json";
import site from "./site-config.json";
import SocialLinks from "./components/SocialLinks";
import HeaderSocialLinks from "./components/HeaderSocialLinks";
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
  useSpring,
} from "framer-motion";
import { X } from "lucide-react";

const getGalleryImageSizes = (img) =>
  img.isWide
    ? "(min-width: 1400px) 660px, (min-width: 1024px) 50vw, 100vw"
    : "(min-width: 1400px) 322px, (min-width: 1024px) 25vw, 50vw";

const getLightboxImageSizes = (img) =>
  img.isWide
    ? "(min-width: 768px) 90vw, 100vw"
    : "(min-width: 768px) 58vw, 100vw";

const photoTitleClassName =
  "font-sans text-base sm:text-[22px] font-light leading-tight tracking-normal uppercase";

// -----------------------------------------------------------------------------
// 组件：单个图片卡片
// -----------------------------------------------------------------------------
const ImageCard = ({ img, index, floatProgress, floatScale, onOpen }) => {
  const cardRef = useRef(null);
  const revealControls = useAnimationControls();
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start end", "end start"],
  });
  const floatDistance = img.isWide ? 6 : index % 2 === 1 ? 10 : 8;
  const cardY = useTransform(
    [floatProgress, floatScale],
    ([progress, scale]) => progress * scale * floatDistance
  );
  const imageOffset = useTransform(scrollYProgress, [0, 1], [-2, 2]);
  const smoothImageOffset = useSpring(imageOffset, {
    stiffness: 55,
    damping: 24,
    mass: 0.8,
  });
  const imageY = useTransform(smoothImageOffset, (value) => `${value}%`);

  return (
    <motion.div
      ref={cardRef}
      className={`gallery-reveal gallery-card ${img.isWide ? "gallery-card-wide" : ""}`}
      initial={shouldReduceMotion ? false : "hidden"}
      animate={revealControls}
      whileInView="visible"
      viewport={{ once: true, amount: 0.1, margin: "0px 0px -24px 0px" }}
      variants={{
        hidden: { opacity: 0, y: 24 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: shouldReduceMotion ? 0 : 0.6,
            delay: shouldReduceMotion ? 0 : Math.min(index, 5) * 0.06,
            ease: [0.22, 1, 0.36, 1],
          },
        },
      }}
      onFocusCapture={() => {
        // Keyboard navigation must never land on a transparent card.
        revealControls.stop();
        revealControls.set({ opacity: 1, y: 0 });
      }}
    >
      <motion.button
        type="button"
        aria-label={`Open ${img.title}`}
        onClick={() => onOpen(img)}
        style={{ y: shouldReduceMotion ? 0 : cardY }}
        className="group relative block h-full w-full min-h-0 min-w-0 overflow-hidden bg-neutral-100 text-left cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-4"
      >
        <motion.div
          className="gallery-image"
          style={{ y: shouldReduceMotion ? 0 : imageY }}
        >
          <Image
            src={img.src}
            alt={img.title}
            fill
            sizes={getGalleryImageSizes(img)}
            priority={index === 0}
            className="object-cover transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform group-hover:scale-[1.035]"
            style={{ objectPosition: img.thumbPosition || "center" }}
          />
        </motion.div>
        <div className="pointer-events-none absolute inset-0 hidden transition-colors duration-500 md:block md:group-hover:bg-black/35" />
        <div className="pointer-events-none absolute inset-0 hidden p-3 sm:p-5 md:p-6 md:flex flex-col justify-end">
          <div className="transform translate-y-7 opacity-0 transition-all duration-500 ease-out md:group-hover:translate-y-0 md:group-hover:opacity-100">
            <h3 className={`${photoTitleClassName} text-white mb-1 sm:mb-2`}>
              {img.title}
            </h3>
            <p className="text-gray-300 text-[10px] sm:text-xs font-light tracking-normal uppercase">
              {img.category}
            </p>
          </div>
        </div>
      </motion.button>
    </motion.div>
  );
};

// -----------------------------------------------------------------------------
// 组件：图片放大预览
// -----------------------------------------------------------------------------
const ImageLightbox = ({ img, onClose }) => {
  const isWide = img.isWide;

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const textBlock = (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      onClick={(event) => event.stopPropagation()}
      transition={{
        duration: 0.38,
        ease: [0.22, 1, 0.36, 1],
        delay: 0.12,
      }}
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
      <p className="mt-4 font-sans text-base font-light leading-6 tracking-normal text-white/70">
        {img.description || img.category}
      </p>
    </motion.div>
  );

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`lightbox-title-${img.id}`}
      className="fixed inset-0 z-[100] bg-black/75 text-white backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      onClick={onClose}
    >
      <motion.button
        type="button"
        aria-label="Close image preview"
        onClick={onClose}
        className="fixed right-4 top-4 z-[110] grid size-11 place-items-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur transition-colors hover:bg-white hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-white md:right-8 md:top-8"
        initial={{ opacity: 0, scale: 0.82 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.82 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <X size={20} />
      </motion.button>

      <div className="h-full w-full overflow-y-auto overscroll-contain px-2 pt-18 pb-8 md:px-10 md:py-12">
        <div
          className={
            isWide
              ? "flex min-h-full items-start justify-center md:pt-8"
              : "flex min-h-full items-start justify-center md:items-center"
          }
        >
          <motion.div
            className={
              isWide
                ? "flex w-full max-w-6xl flex-col items-center gap-5 md:gap-6"
                : "flex w-full max-w-6xl flex-col items-center gap-6 md:flex-row md:items-center md:justify-center md:gap-10 lg:gap-14"
            }
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.2,
              ease: "easeOut",
            }}
          >
            <motion.div
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-full md:w-auto"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{
                type: "spring",
                stiffness: 190,
                damping: 24,
                mass: 0.9,
              }}
            >
              <Image
                src={img.src}
                alt={img.title}
                width={img.width}
                height={img.height}
                sizes={getLightboxImageSizes(img)}
                priority
                className={
                  isWide
                    ? "h-auto w-full max-w-full object-contain shadow-[0_22px_80px_rgba(0,0,0,0.45)] md:max-h-[64vh] md:w-auto"
                    : "h-auto w-full max-w-full object-contain shadow-[0_22px_80px_rgba(0,0,0,0.45)] md:max-h-[82vh] md:w-auto md:max-w-[58vw]"
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

// -----------------------------------------------------------------------------
// 组件：画廊
// -----------------------------------------------------------------------------
const ParallaxGallery = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const visibleImages = images.filter((img) => img.src);
  const { scrollY } = useScroll();
  const laggedScroll = useSpring(scrollY, {
    stiffness: 150,
    damping: 24,
    mass: 0.6,
  });
  const floatScale = useMotionValue(1);
  // One shared lag keeps the cards together; stopping scroll returns every card to zero.
  const floatProgress = useTransform(
    [scrollY, laggedScroll],
    ([scroll, lagged]) => Math.max(-1, Math.min(1, (scroll - lagged) / 80))
  );

  useLayoutEffect(() => {
    const syncScroll = () => {
      const currentScroll = Math.max(0, window.scrollY);
      floatScale.set(window.matchMedia("(min-width: 1024px)").matches ? 1.8 : 1);
      scrollY.set(currentScroll);
      laggedScroll.jump(currentScroll);
    };
    syncScroll();
    window.addEventListener("pageshow", syncScroll);
    window.addEventListener("resize", syncScroll);
    return () => {
      window.removeEventListener("pageshow", syncScroll);
      window.removeEventListener("resize", syncScroll);
    };
  }, [scrollY, laggedScroll, floatScale]);

  return (
    <>
      <section aria-label="Selected photographs" className="gallery-layout w-full max-w-[1400px] mx-auto px-4 md:px-8 pb-16 md:pb-24">
        {visibleImages.length === 0 && (
          <p className="py-20 text-center font-light text-neutral-500">
            New photographs coming soon.
          </p>
        )}
        <div className="gallery-grid">
          {visibleImages.map((img, index) => (
              <ImageCard
                key={img.id}
                img={img}
                index={index}
                floatProgress={floatProgress}
                floatScale={floatScale}
                onOpen={setSelectedImage}
              />
          ))}
        </div>
      </section>

      <AnimatePresence>
        {selectedImage && (
          <ImageLightbox
            key={selectedImage.id}
            img={selectedImage}
            onClose={() => setSelectedImage(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

// -----------------------------------------------------------------------------
// 组件：从首页标题收起为导航的品牌
// -----------------------------------------------------------------------------
const clampProgress = (value) => Math.min(1, Math.max(0, value));
const smoothStep = (value) => value * value * (3 - 2 * value);
const collapseEasing = (scroll, distance) =>
  1 - (1 - clampProgress(scroll / distance)) ** 2;

const Intro = () => {
  const originRef = useRef(null);
  const { scrollY } = useScroll();
  const shouldReduceMotion = useReducedMotion();
  const originY = useMotionValue(144);
  const titleLineHeight = useMotionValue(36);
  const collapseDistance = useMotionValue(184);
  const compactScale = useMotionValue(2 / 3);
  const smoothScroll = useSpring(scrollY, {
    stiffness: 260,
    damping: 36,
    mass: 0.65,
  });
  const activeScroll = shouldReduceMotion ? scrollY : smoothScroll;
  // Derive directly from the scroll source so restored geometry updates atomically.
  const titleTransform = useTransform(
    [activeScroll, collapseDistance, originY, compactScale],
    ([scroll, distance, origin, scale]) => {
      const eased = collapseEasing(scroll, distance);
      const y = origin + (20 - origin) * eased;
      const size = 1 + (scale - 1) * eased;
      return `translate3d(0, ${y}px, 0) scale(${size})`;
    }
  );
  // Keep full-size hit areas centered on the title as its visual height changes.
  const contactY = useTransform(
    [activeScroll, collapseDistance, originY, compactScale, titleLineHeight],
    ([scroll, distance, origin, compact, lineHeight]) => {
      const eased = collapseEasing(scroll, distance);
      const y = origin + (20 - origin) * eased;
      const scale = 1 + (compact - 1) * eased;
      return y + (lineHeight * scale - 44) / 2;
    }
  );
  const contactIconScale = useTransform(
    [activeScroll, collapseDistance],
    ([scroll, distance]) => 1.2 - 0.2 * collapseEasing(scroll, distance)
  );
  const surfaceOpacity = useTransform([activeScroll, collapseDistance], ([scroll, distance]) =>
    smoothStep(clampProgress((scroll / distance - 0.4) / 0.6))
  );
  const subtitleOpacity = useTransform([activeScroll, collapseDistance], ([scroll, distance]) =>
    1 - smoothStep(clampProgress((scroll / distance - 0.04) / 0.52))
  );
  const subtitleY = useTransform([activeScroll, collapseDistance], ([scroll, distance]) =>
    -8 * clampProgress(scroll / distance / 0.6)
  );
  const subtitleBlur = useTransform([activeScroll, collapseDistance], ([scroll, distance]) =>
    `blur(${3 * clampProgress(scroll / distance / 0.6)}px)`
  );

  useLayoutEffect(() => {
    const syncScroll = () => {
      const currentScroll = Math.max(0, window.scrollY);
      const origin = originRef.current;
      if (origin) {
        const originBounds = origin.getBoundingClientRect();
        const startY = originBounds.top + currentScroll;
        const availableScroll = document.documentElement.scrollHeight - window.innerHeight;
        originY.set(startY);
        titleLineHeight.set(originBounds.height);
        // A short gallery should still finish the transition on tall screens.
        collapseDistance.set(
          availableScroll > 0 ? Math.min(startY + 40, availableScroll) : startY + 40
        );
        compactScale.set(window.matchMedia("(min-width: 768px)").matches ? 2 / 3 : 0.75);
      }
      scrollY.set(currentScroll);
      // Restored scroll positions must render in place, without replaying the intro.
      smoothScroll.jump(currentScroll);
    };
    syncScroll();
    const resizeObserver = new ResizeObserver(syncScroll);
    resizeObserver.observe(document.body);
    window.addEventListener("pageshow", syncScroll);
    window.addEventListener("resize", syncScroll);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("pageshow", syncScroll);
      window.removeEventListener("resize", syncScroll);
    };
  }, [scrollY, smoothScroll, originY, titleLineHeight, compactScale, collapseDistance]);

  return (
    <>
      {/* The fixed title keeps a stable space in the page so the gallery never shifts. */}
      <div ref={originRef} aria-hidden="true" className="h-8 md:h-9" />
      <motion.div
        aria-hidden="true"
        style={{ opacity: surfaceOpacity }}
        className="brand-nav-surface pointer-events-none fixed inset-x-0 top-0 z-40 h-16 bg-white/75 shadow-[0_1px_0_rgba(0,0,0,0.05)] backdrop-blur-md"
      />
      <header
        className="brand-header pointer-events-none fixed inset-x-0 top-0 z-50 w-full max-w-[1400px] mx-auto px-4 md:px-8"
      >
        <motion.h1
          style={{ transform: titleTransform }}
          className="brand-wordmark pointer-events-auto w-fit origin-top-left text-2xl leading-8 md:text-3xl md:leading-9"
        >
          <a
            href="#top"
            onClick={(event) => {
              event.preventDefault();
              window.scrollTo({
                top: 0,
                behavior: shouldReduceMotion ? "auto" : "smooth",
              });
            }}
            className="focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            {site.name}
          </a>
        </motion.h1>
        <HeaderSocialLinks y={contactY} iconScale={contactIconScale} />
      </header>
      <section className="relative w-full max-w-[1400px] mx-auto px-4 pt-3 pb-8 md:px-8 md:pb-10">
        <motion.p
          style={{
            opacity: subtitleOpacity,
            y: shouldReduceMotion ? 0 : subtitleY,
            filter: shouldReduceMotion ? "none" : subtitleBlur,
          }}
          className="intro-tagline text-base font-light text-neutral-500 max-w-xl leading-6"
        >
          {site.tagline}
        </motion.p>
      </section>
    </>
  );
};

// -----------------------------------------------------------------------------
// 组件：Footer
// -----------------------------------------------------------------------------
const Footer = () => {
  return (
    <footer className="bg-black text-white py-16 md:py-20 px-6">
      <div className="max-w-[1400px] mx-auto">
        <h3 className="brand-wordmark text-2xl mb-6">
          {site.name}
        </h3>
        <p className="text-gray-400 max-w-sm font-light leading-relaxed">
          {site.tagline}
        </p>
        <SocialLinks />
      </div>
      <div className="max-w-[1400px] mx-auto mt-16 pt-8 border-t border-white/10 text-xs text-gray-600 uppercase tracking-wider">
        <span>© {new Date().getFullYear()} {site.name}</span>
      </div>
    </footer>
  );
};

// -----------------------------------------------------------------------------
// 主页面组件
// -----------------------------------------------------------------------------
export default function Home() {
  return (
    <div id="top" className="relative bg-white min-h-screen pt-32 md:pt-36 text-black font-sans selection:bg-black selection:text-white">
      <main>
        <Intro />
        <ParallaxGallery />
      </main>
      <Footer />
    </div>
  );
}
