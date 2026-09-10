import { MOTION_DELAY } from "./motion-tokens.mjs";

export const GALLERY_REVEAL_VIEWPORT = Object.freeze({
  once: true,
  amount: "some",
  margin: "0px 0px 120px 0px",
});

const initialRowRanks = new WeakMap();

const documentTop = (element) => {
  let top = 0;
  for (let current = element; current; current = current.offsetParent) top += current.offsetTop;
  return top;
};

export function getGalleryRevealDelay(element, indexInRow, scrollY, viewportHeight) {
  if (!element?.parentElement) return 0;
  const grid = element.parentElement;
  if (!initialRowRanks.has(grid)) {
    // Capture the real viewport once, without the observer's lead-in region.
    // Later scroll entrances must not queue behind rows already on screen.
    const visible = Array.from(grid.children, (card) => ({ card, top: documentTop(card) }))
      .filter(({ card, top }) => top < scrollY + viewportHeight && top + card.clientHeight > scrollY);
    const rows = [...new Set(visible.map(({ top }) => top))].sort((a, b) => a - b);
    initialRowRanks.set(grid, new Map(visible.map(({ card, top }) => [card, rows.indexOf(top)])));
  }
  return (initialRowRanks.get(grid).get(element) ?? 0) * MOTION_DELAY.galleryRow
    + Math.min(indexInRow, 5) * MOTION_DELAY.gallery;
}
