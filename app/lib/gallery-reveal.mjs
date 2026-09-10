import { MOTION_DELAY } from "./motion-tokens.mjs";

const documentTop = (element) => {
  let top = 0;
  for (let current = element; current; current = current.offsetParent) top += current.offsetTop;
  return top;
};

export function getGalleryRevealDelay(element, indexInRow, scrollY) {
  if (!element?.parentElement) return 0;
  const top = documentTop(element);
  const precedingVisibleRows = new Set();
  for (const card of element.parentElement.children) {
    const rowTop = documentTop(card);
    // Ignore the entrance translation and rows that have left the viewport.
    // The 10% visibility threshold matches the existing entrance observer.
    if (rowTop < top && rowTop + card.clientHeight * 0.9 > scrollY) {
      precedingVisibleRows.add(rowTop);
    }
  }
  return precedingVisibleRows.size * MOTION_DELAY.galleryRow
    + Math.min(indexInRow, 5) * MOTION_DELAY.gallery;
}
