import assert from "node:assert/strict";
import test from "node:test";
import { getGalleryColumnSpans, getGalleryLayout } from "../app/lib/gallery-layout.mjs";
import { getGalleryRevealDelay } from "../app/lib/gallery-reveal.mjs";
import { MOTION_DURATION } from "../app/lib/motion-tokens.mjs";

const portrait = { id: 1, width: 300, height: 400, isWide: false };
const wide = { id: 2, width: 600, height: 400, isWide: true };
const square = { id: 3, width: 400, height: 400, isWide: true };
const images = [wide, portrait, portrait, square, portrait, wide, portrait, square]
  .map((image, index) => ({ ...image, id: index + 1 }));

const makeRows = (count, columns) => {
  const parent = { offsetTop: 100, offsetParent: null, children: [] };
  parent.children = Array.from({ length: count * columns }, (_, index) => ({
    offsetTop: Math.floor(index / columns) * 300,
    offsetParent: parent,
    clientHeight: 280,
    parentElement: parent,
  }));
  return parent.children;
};

test("visible rows keep top-to-bottom order while their entrances overlap", () => {
  const cards = makeRows(3, 6);
  const delays = cards.map((card, index) => getGalleryRevealDelay(card, index % 6, 0, 1000));
  assert.deepEqual(delays.slice(0, 6), [0, 30, 60, 90, 120, 150]);
  assert.deepEqual(delays.slice(6, 12), [160, 190, 220, 250, 280, 310]);
  assert.ok(delays[6] > delays[5]);
  assert.ok(delays[12] > delays[11]);
  assert.ok(delays[6] - delays[0] < MOTION_DURATION.content / 3, "the next row joins during the first third of the entrance");
});

test("restored or scrolled galleries restart timing at the first visible row", () => {
  const cards = makeRows(12, 2);
  assert.equal(getGalleryRevealDelay(cards[20], 0, 3100, 800), 0);
  assert.equal(getGalleryRevealDelay(cards[21], 1, 3100, 800), 30);
  assert.equal(getGalleryRevealDelay(cards[22], 0, 3100, 800), 160);
  assert.equal(getGalleryRevealDelay(makeRows(3, 2)[2], 0, 375, 800), 160, "a partially visible preceding row belongs to the initial viewport");
  assert.equal(getGalleryRevealDelay(makeRows(3, 2)[2], 0, 380, 800), 0, "a row above the viewport does not delay the initial entrance");
  assert.equal(getGalleryRevealDelay(null, 0, 0, 800), 0);
});

test("newly scrolled rows do not wait for the initial visible rows", () => {
  const cards = makeRows(5, 6);
  assert.equal(getGalleryRevealDelay(cards[0], 0, 0, 650), 0);
  assert.equal(getGalleryRevealDelay(cards[6], 0, 0, 650), 160);
  // The next row starts outside the initial viewport and has no stored row delay.
  assert.equal(getGalleryRevealDelay(cards[12], 0, 0, 650), 0);
  assert.equal(getGalleryRevealDelay(cards[17], 5, 0, 650), 150);
  // Previous rows remain visible after scrolling, but add no new row delay.
  assert.equal(getGalleryRevealDelay(cards[18], 0, 500, 650), 0);
  assert.equal(getGalleryRevealDelay(cards[19], 1, 500, 650), 30);
});

test("initial row timing is independent of callback order and later layout changes", () => {
  const cards = makeRows(3, 6);
  assert.equal(getGalleryRevealDelay(cards[12], 0, 0, 1000), 320);
  assert.equal(getGalleryRevealDelay(cards[6], 0, 0, 1000), 160);
  assert.equal(getGalleryRevealDelay(cards[0], 0, 0, 1000), 0);
  cards[7].offsetTop = 900;
  assert.equal(getGalleryRevealDelay(cards[7], 1, 500, 600), 190);
});

test("square photos fill a final portrait slot and otherwise keep two columns", () => {
  assert.deepEqual(getGalleryColumnSpans([portrait, square], 2), [1, 1]);
  assert.deepEqual(getGalleryColumnSpans([portrait, square], 3), [1, 2]);
  assert.deepEqual(getGalleryColumnSpans([wide, portrait, square], 4), [2, 1, 1]);
  assert.deepEqual(getGalleryColumnSpans([square], 6), [2]);
});

test("ordinary wide images wrap first, while consecutive squares use the actual remaining space", () => {
  assert.deepEqual(getGalleryColumnSpans([wide, wide, square], 3), [2, 2, 1]);
  assert.deepEqual(getGalleryColumnSpans([square, square, square, square], 3), [2, 1, 2, 1]);
  assert.deepEqual(getGalleryColumnSpans([portrait, wide, square], 2), [1, 2, 2]);
});

test("entrance order counts photos from the left and restarts after filled or wrapped rows", () => {
  assert.deepEqual(getGalleryLayout([wide, wide, square, portrait], 3), [
    { span: 2, indexInRow: 0 },
    { span: 2, indexInRow: 0 },
    { span: 1, indexInRow: 1 },
    { span: 1, indexInRow: 0 },
  ]);
  assert.deepEqual(getGalleryLayout([wide, portrait, square, portrait], 4), [
    { span: 2, indexInRow: 0 },
    { span: 1, indexInRow: 1 },
    { span: 1, indexInRow: 2 },
    { span: 1, indexInRow: 0 },
  ]);
});

test("each overview row gets its own entrance sequence on desktop and mobile", () => {
  const ranks = (columns) => getGalleryLayout(images, columns).map(({ indexInRow }) => indexInRow);
  assert.deepEqual(ranks(6), [0, 1, 2, 3, 0, 1, 2, 3]);
  assert.deepEqual(ranks(2), [0, 0, 1, 0, 0, 0, 0, 1]);
  assert.ok(ranks(1).every((rank) => rank === 0));
});

test("square placement follows the available slot at each column count", () => {
  const entries = [wide, portrait, square];
  for (const columns of [2, 3, 4, 5, 6]) {
    const spans = getGalleryColumnSpans(entries, columns);
    assert.equal(spans[2], columns === 2 || columns === 4 ? 1 : 2);
    assert.equal(spans.length, entries.length);
    assert.ok(spans.every((span) => span === 1 || span === 2));
  }
});

test("layout does not mutate intrinsic shape, IDs, order or the lightbox data", () => {
  const before = structuredClone(images);
  for (const columns of [1, 2, 3, 4, 5, 6, 7]) getGalleryColumnSpans(images, columns);
  assert.deepEqual(images, before);
  assert.equal(images[3].width, images[3].height);
  assert.equal(images[3].isWide, true);
});

test("empty and one-column grids remain valid; SSR preserves the base layout", () => {
  assert.deepEqual(getGalleryColumnSpans([], 2), []);
  assert.deepEqual(getGalleryColumnSpans([wide, square, portrait], 1), [1, 1, 1]);
  assert.deepEqual(getGalleryColumnSpans([wide, square, portrait], null), [2, 2, 1]);
  for (const value of [0, -1, 1.5, NaN, Infinity, undefined]) {
    assert.throws(() => getGalleryColumnSpans(images, value), /positive integer/);
  }
});
