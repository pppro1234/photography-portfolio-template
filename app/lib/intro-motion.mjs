import { MOTION_SPRING } from "./motion-tokens.mjs";

export const INTRO_SPRING = MOTION_SPRING.intro;

export const clampProgress = (value) => Math.min(1, Math.max(0, value));
export const smoothStep = (value) => value * value * (3 - 2 * value);
export const collapseEasing = (scroll, distance) =>
  1 - (1 - clampProgress(scroll / Math.max(1, distance))) ** 2;

export function getIntroGeometry({ originTop, originLeft, slotTop = 0, slotLeft = originLeft, navHeight = 44, desktop = true, availableScroll = 0 }) {
  const scale = desktop ? 2 / 3 : 0.75;
  const lineHeight = desktop ? 36 : 32;
  return {
    originTop,
    offsetX: originLeft - slotLeft,
    offsetY: originTop - slotTop,
    compactY: (navHeight - lineHeight * scale) / 2,
    scale,
    scrollable: availableScroll > 0,
    distance: availableScroll > 0 ? Math.min(originTop + 40, availableScroll) : originTop + 40,
  };
}

export function getBrandTransform(scroll, geometry, menuProgress = 0) {
  const progress = geometry.scrollable === false ? 1 : Math.max(collapseEasing(scroll, geometry.distance), clampProgress(menuProgress));
  return {
    x: geometry.offsetX * (1 - progress),
    y: geometry.offsetY + (geometry.compactY - geometry.offsetY) * progress,
    scale: 1 + (geometry.scale - 1) * progress,
  };
}

export function getNavigationReveal(scroll, geometry, menuProgress = 0) {
  // Show the controls only during the final part of the original collapse.
  // If the page cannot scroll, keep a usable, compact navigation instead.
  if (geometry.scrollable === false) return 1;
  const scrollReveal = smoothStep(clampProgress((scroll / Math.max(1, geometry.distance) - 0.65) / 0.3));
  return Math.max(scrollReveal, clampProgress(menuProgress));
}
