"use client";

import { useCallback, useLayoutEffect } from "react";
import { cancelFrame, frame } from "framer-motion";

export function useSpringCleanup(spring) {
  const stopSpring = useCallback(() => spring.jump(spring.get()), [spring]);

  useLayoutEffect(() => {
    // A StrictMode effect restart must not stop the newly active controller.
    cancelFrame(stopSpring);
    return () => {
      stopSpring();
      // Motion may already have queued a spring start for postRender; stop it
      // after that queue drains as well as stopping any animation running now.
      frame.postRender(stopSpring);
    };
  }, [stopSpring]);
}
