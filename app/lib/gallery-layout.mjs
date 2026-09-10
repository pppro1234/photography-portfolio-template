// Match normal Grid row placement without moving photos out of their sequence.
// Intrinsic shape stays separate from the temporary thumbnail crop.
export function getGalleryLayout(images, columns) {
  if (columns === null) return images.map((image) => ({ span: image.isWide ? 2 : 1, indexInRow: 0 }));
  if (!Number.isInteger(columns) || columns < 1) throw new RangeError("Gallery columns must be a positive integer.");
  let occupied = 0;
  let indexInRow = 0;
  return images.map((image) => {
    const square = image.width === image.height;
    const preferred = square ? (columns - occupied === 1 ? 1 : 2) : image.isWide ? 2 : 1;
    const span = Math.min(columns, preferred);
    if (occupied + span > columns) {
      occupied = 0;
      indexInRow = 0;
    }
    const placement = { span, indexInRow };
    occupied = (occupied + span) % columns;
    indexInRow = occupied === 0 ? 0 : indexInRow + 1;
    return placement;
  });
}

export function getGalleryColumnSpans(images, columns) {
  return getGalleryLayout(images, columns).map(({ span }) => span);
}
