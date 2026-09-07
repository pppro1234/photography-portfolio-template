import { MOTION_DELAY, MOTION_DURATION, motionTransition } from "./motion-tokens.mjs";

export function getAboutRevealAnimation({ order = 0, media = false, instant = false } = {}) {
  return {
    hidden: { opacity: 0, y: media ? 0 : 10 },
    visible: { opacity: 1, y: 0 },
    transition: motionTransition(media ? MOTION_DURATION.image : MOTION_DURATION.content, {
      instant,
      delay: Math.min(6, Math.max(0, order)) * MOTION_DELAY.paragraph,
    }),
  };
}
