"use client";

import { domAnimation, LazyMotion } from "framer-motion";
import IntroMotionProvider from "./IntroMotionProvider";
import GalleryFilterMotionProvider from "./GalleryFilterMotionProvider";

export default function MotionProvider({ children }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <IntroMotionProvider>
        <GalleryFilterMotionProvider>{children}</GalleryFilterMotionProvider>
      </IntroMotionProvider>
    </LazyMotion>
  );
}
