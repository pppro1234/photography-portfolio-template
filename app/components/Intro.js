"use client";

import { m as motion } from "framer-motion";
import { useIntroMotion } from "./IntroMotionProvider";
import site from "../site-config.json";

export default function Intro({ home = false, title, description = site.tagline }) {
  const { titleTransform, subtitleOpacity, subtitleY, subtitleBlur, shouldReduceMotion } = useIntroMotion();

  return (
    <>
      <div className="w-full max-w-[1400px] mx-auto px-4 md:px-8">
        {/* The home heading lives in the shared header: one wordmark, two positions. */}
        <div id="intro-origin" aria-hidden="true" className="h-8 md:h-9" />
      </div>
      {!home && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-40 w-full max-w-[1400px] mx-auto px-4 md:px-8">
          <motion.h1 style={{ transform: titleTransform, opacity: subtitleOpacity }}
            className="work-heading w-fit origin-top-left text-2xl leading-8 md:text-3xl md:leading-9">
            {title}
          </motion.h1>
        </div>
      )}
      <section className="relative w-full max-w-[1400px] mx-auto px-4 pt-3 pb-8 md:px-8 md:pb-10">
        <motion.p style={{ opacity: subtitleOpacity, y: shouldReduceMotion ? 0 : subtitleY, filter: shouldReduceMotion ? "none" : subtitleBlur }}
          className="intro-tagline text-base font-light text-neutral-500 max-w-xl leading-6">
          {description}
        </motion.p>
      </section>
    </>
  );
}
