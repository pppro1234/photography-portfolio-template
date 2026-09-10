export const GALLERY_SORT_MODES = Object.freeze(["original", "color", "brightness"]);

export function hasAppearance(image) {
  const value = image.appearance;
  return value?.version === 1 && ["lightness", "a", "b", "contrast", "chroma"]
    .every((field) => Number.isFinite(value[field]))
    && value.lightness >= 0 && value.lightness <= 1 && value.contrast >= 0 && value.chroma >= 0;
}

export function appearanceDistance(first, second) {
  return Math.hypot(
    0.65 * (first.lightness - second.lightness),
    1.4 * (first.a - second.a),
    1.4 * (first.b - second.b),
    0.15 * (first.contrast - second.contrast),
    0.35 * (first.chroma - second.chroma),
  );
}

export function sortGalleryImages(images, mode = "original") {
  if (mode !== "color" && mode !== "brightness") return [...images];
  const known = images.filter(hasAppearance);
  const unknown = images.filter((image) => !hasAppearance(image));
  if (mode === "brightness") {
    return known.sort((a, b) => b.appearance.lightness - a.appearance.lightness).concat(unknown);
  }
  if (!known.length) return unknown;
  // Starting at the darkest frame gives the similarity walk a stable origin.
  // Strict comparisons retain editorial order when two candidates tie.
  let start = 0;
  for (let index = 1; index < known.length; index++) {
    if (known[index].appearance.lightness < known[start].appearance.lightness) start = index;
  }
  const ordered = known.splice(start, 1);
  while (known.length) {
    let nearest = 0;
    let distance = Infinity;
    for (let index = 0; index < known.length; index++) {
      const candidate = appearanceDistance(ordered.at(-1).appearance, known[index].appearance);
      if (candidate < distance) { nearest = index; distance = candidate; }
    }
    ordered.push(...known.splice(nearest, 1));
  }
  return ordered.concat(unknown);
}

// Sort the collection before filtering so the same photographs keep their
// relative sequence when moving between the overview and a series.
export function getOrderedGalleryImages(collection, photographs, mode) {
  if (!GALLERY_SORT_MODES.includes(mode)) {
    throw new TypeError("gallery-settings.json sortMode must be original, color, or brightness.");
  }
  const visibleIds = new Set(photographs.map(({ id }) => id));
  return sortGalleryImages(collection, mode).filter(({ id }) => visibleIds.has(id));
}
