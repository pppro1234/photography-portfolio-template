// Fallbacks mirror the fluid grid's 180px minimum, 8–16px gap and page
// padding. Lazy images use their actual layout width where auto is supported.
const widths = [
  [1400, "210px", "435px"],
  [1334, "calc(16.667vw - 24px)", "calc(33.334vw - 32px)"],
  [1218, "calc(15.667vw - 10.667px)", "calc(32.534vw - 21.334px)"],
  [1013, "calc(19.04vw - 12.8px)", "calc(39.28vw - 25.6px)"],
  [814, "calc(24.1vw - 16px)", "calc(49.4vw - 32px)"],
  [768, "calc(32.534vw - 21.334px)", "calc(66.267vw - 42.667px)"],
  [667, "calc(32.534vw - 10.667px)", "calc(66.267vw - 21.334px)"],
  [588, "calc(33.334vw - 16px)", "calc(66.667vw - 24px)"],
];

export function getGalleryImageSizes(isWide, lazy = true) {
  const fallback = widths.map(([minimum, portrait, wide]) => `(min-width: ${minimum}px) ${isWide ? wide : portrait}`)
    .concat(isWide ? "calc(100vw - 32px)" : "calc(50vw - 20px)").join(", ");
  return lazy ? `auto, ${fallback}` : fallback;
}
