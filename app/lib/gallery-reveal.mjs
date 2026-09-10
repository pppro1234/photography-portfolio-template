import { MOTION_DELAY } from "./motion-tokens.mjs";

const revealThreshold = 0.03;
const revealCallbacks = new Map();
let revealObserver;

function releaseRevealObserver() {
  if (revealCallbacks.size === 0) {
    revealObserver?.disconnect();
    revealObserver = undefined;
  }
}

export function observeGalleryReveal(element, onReveal) {
  if (typeof IntersectionObserver === "undefined") {
    onReveal();
    return () => {};
  }
  if (!revealObserver) {
    const observer = new IntersectionObserver((entries) => {
      if (revealObserver !== observer) return;
      for (const entry of entries) {
        // isIntersecting can be true before the configured ratio is reached.
        if (!entry.isIntersecting || entry.intersectionRatio < revealThreshold) continue;
        const callback = revealCallbacks.get(entry.target);
        if (!callback) continue;
        revealCallbacks.delete(entry.target);
        observer.unobserve(entry.target);
        callback();
      }
      releaseRevealObserver();
    }, { rootMargin: "0px", threshold: revealThreshold });
    revealObserver = observer;
  }
  revealCallbacks.set(element, onReveal);
  revealObserver.observe(element);
  return () => {
    if (revealCallbacks.get(element) !== onReveal) return;
    revealCallbacks.delete(element);
    revealObserver?.unobserve(element);
    releaseRevealObserver();
  };
}

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
    // Capture the real viewport once, independently of animation transforms.
    // Later scroll entrances must not queue behind rows already on screen.
    const visible = Array.from(grid.children, (card) => ({ card, top: documentTop(card) }))
      .filter(({ card, top }) => top < scrollY + viewportHeight && top + card.clientHeight > scrollY);
    const rows = [...new Set(visible.map(({ top }) => top))].sort((a, b) => a - b);
    initialRowRanks.set(grid, new Map(visible.map(({ card, top }) => [card, rows.indexOf(top)])));
  }
  return (initialRowRanks.get(grid).get(element) ?? 0) * MOTION_DELAY.galleryRow
    + Math.min(indexInRow, 5) * MOTION_DELAY.gallery;
}
