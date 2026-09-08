import { galleryCategories, getCategoryHref, getGalleryCategory } from "./gallery-categories.mjs";

export function isGalleryCategoryPath(pathname) {
  return galleryCategories.some(({ slug }) => getCategoryHref(slug) === pathname);
}

export function shouldAnimateSeriesIntro(previous, category, reducedMotion = false) {
  return !reducedMotion && previous?.category !== category
    && !!getGalleryCategory(previous?.category) && !!getGalleryCategory(category);
}

// Coordinates are relative to the scrollable track, not the viewport.
export function getFilterBounds(label, track) {
  return { x: label.left - track.left, y: label.bottom - track.top + 3, width: label.width };
}

export function getFilterMotionStart(previous, { category, trackWidth, target, previousTarget, reducedMotion }) {
  if (reducedMotion || !previous || previous.category === category || !previousTarget) return target;
  // Continue an interrupted animation. After a resize/font change, remeasure
  // the previous label instead of reusing stale pixel coordinates.
  return Math.abs(previous.trackWidth - trackWidth) < 1 ? previous.bounds : previousTarget;
}

export function getFilterScrollLeft({ scrollLeft, viewportWidth, scrollWidth, target }) {
  const visible = Math.min(Math.max(scrollLeft, target.x + target.width - viewportWidth), target.x);
  return Math.max(0, Math.min(visible, scrollWidth - viewportWidth));
}
