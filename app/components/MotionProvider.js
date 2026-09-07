"use client";

import { domAnimation, LazyMotion } from "framer-motion";
import IntroMotionProvider from "./IntroMotionProvider";

export default function MotionProvider({ children }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <IntroMotionProvider>{children}</IntroMotionProvider>
    </LazyMotion>
  );
}
