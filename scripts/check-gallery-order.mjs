import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import sharp from "sharp";
import { measureAppearance, readPhotograph } from "./lib/gallery-appearance.mjs";
import { appearanceDistance, getOrderedGalleryImages, hasAppearance, sortGalleryImages } from "../app/lib/gallery-order.mjs";
import { getGalleryImageSizes } from "../app/lib/gallery-image-sizes.mjs";

const images = JSON.parse(readFileSync(new URL("../app/gallery-data.json", import.meta.url)));
const require = createRequire(import.meta.url);
const { getImageProps } = require("next/image");
const appearance = (r, g, b) => measureAppearance(Uint8Array.from([r, g, b, 255]));

test("imports use displayed dimensions for EXIF-rotated photographs", async () => {
  const image = await sharp({ create: { width: 20, height: 40, channels: 3, background: "red" } })
    .withMetadata({ orientation: 6 }).jpeg().toBuffer();
  const result = await readPhotograph(image);
  assert.equal(result.width, 40);
  assert.equal(result.height, 20);
  assert.ok(hasAppearance(result));
});

test("pixel analysis distinguishes lightness, color and contrast without inventing grey hue", () => {
  const black = appearance(0, 0, 0), white = appearance(255, 255, 255), grey = appearance(128, 128, 128);
  assert.equal(black.lightness, 0);
  assert.equal(white.lightness, 1);
  assert.ok(grey.lightness > 0 && grey.lightness < 1);
  assert.ok(Math.abs(grey.a) < 0.0001 && Math.abs(grey.b) < 0.0001);
  const red = appearance(200, 30, 30), nearbyRed = appearance(210, 40, 40), blue = appearance(30, 30, 200);
  assert.ok(appearanceDistance(red, nearbyRed) < appearanceDistance(red, blue));
  const checker = measureAppearance(Uint8Array.from([0, 0, 0, 255, 255, 255, 255, 255]));
  assert.equal(checker.lightness, 0.5);
  assert.equal(checker.contrast, 0.5);
});

test("transparent pixels do not alter the visible color and fully transparent images remain finite", () => {
  const red = appearance(200, 30, 30);
  assert.deepEqual(measureAppearance(Uint8Array.from([200, 30, 30, 255, 0, 255, 0, 0])), red);
  assert.ok(hasAppearance({ appearance: measureAppearance(Uint8Array.from([0, 0, 0, 0])) }));
});

test("legacy galleries remain valid before their first appearance analysis", () => {
  for (const image of images) {
    if (image.appearance !== undefined) assert.ok(hasAppearance(image), image.src);
  }
  const legacy = images.map(({ appearance, ...image }) => image);
  for (const mode of ["original", "color", "brightness"]) {
    assert.deepEqual(sortGalleryImages(legacy, mode), legacy);
  }
});

test("sorting preserves originals, returns every image once and stays deterministic", () => {
  const original = structuredClone(images);
  for (const mode of ["original", "color", "brightness", "unknown"]) {
    const sorted = sortGalleryImages(images, mode);
    assert.notEqual(sorted, images);
    assert.deepEqual(sorted, sortGalleryImages(images, mode));
    assert.deepEqual(sorted.map(({ id }) => id).sort((a, b) => a - b), images.map(({ id }) => id).sort((a, b) => a - b));
  }
  assert.deepEqual(images, original);
  assert.deepEqual(sortGalleryImages(images, "original"), original);
});

test("brightness runs from light to dark; ties and missing measurements keep their original order", () => {
  const sorted = sortGalleryImages(images, "brightness").filter(hasAppearance);
  assert.ok(sorted.every((image, index) => !index || sorted[index - 1].appearance.lightness >= image.appearance.lightness));
  const grey = appearance(128, 128, 128);
  const entries = [{ id: 4 }, { id: 2, appearance: grey }, { id: 1, appearance: grey }, { id: 3, appearance: { ...grey, a: NaN } }];
  for (const mode of ["color", "brightness"]) {
    assert.deepEqual(sortGalleryImages(entries, mode).map(({ id }) => id), [2, 1, 4, 3]);
    assert.deepEqual(sortGalleryImages([], mode), []);
    assert.deepEqual(sortGalleryImages(entries.slice(0, 1), mode), entries.slice(0, 1));
  }
});

test("color sequence groups similar colors without depending on personal photographs", () => {
  const entries = [
    { id: 1, appearance: appearance(200, 30, 30) },
    { id: 2, appearance: appearance(30, 30, 200) },
    { id: 3, appearance: appearance(210, 40, 40) },
  ];
  const before = structuredClone(entries);
  const ids = sortGalleryImages(entries, "color").map(({ id }) => id);
  assert.equal(Math.abs(ids.indexOf(1) - ids.indexOf(3)), 1);
  assert.deepEqual(entries, before);
});

test("series retain overview relative order with no missing or duplicate IDs", () => {
  for (const category of new Set(images.map((image) => image.category))) {
    const photographs = images.filter((image) => image.category === category);
    for (const mode of ["original", "color", "brightness"]) {
      const ordered = getOrderedGalleryImages(images, photographs, mode);
      assert.deepEqual(ordered, sortGalleryImages(images, mode).filter((image) => image.category === category));
      assert.equal(ordered.length, photographs.length);
      assert.deepEqual(getOrderedGalleryImages(images, [], mode), []);
    }
  }
});

test("the server setting selects one sequence and rejects invalid configuration", () => {
  const settings = JSON.parse(readFileSync(new URL("../app/gallery-settings.json", import.meta.url)));
  assert.deepEqual(getOrderedGalleryImages(images, images, settings.sortMode), sortGalleryImages(images, settings.sortMode));
  for (const mode of [undefined, null, "", "colour"]) {
    assert.throws(() => getOrderedGalleryImages(images, images, mode), /sortMode must be/);
  }
});

test("responsive source candidates include small thumbnails; only lazy images request automatic sizing", () => {
  for (const isWide of [false, true]) {
    for (const lazy of [false, true]) {
      const sizes = getGalleryImageSizes(isWide, lazy);
      assert.equal(sizes.startsWith("auto, "), lazy);
      const { props } = getImageProps({ src: "/gallery/example.jpg", alt: "Example", fill: true, sizes, loading: lazy ? "lazy" : "eager" });
      assert.equal(props.sizes, sizes);
      assert.match(props.srcSet, / 256w,/);
      assert.match(props.srcSet, / 384w,/);
    }
  }
});

test("color sequence groups similar colors without editing their source order", () => {
  const entries = [
    { id: 1, appearance: appearance(0, 0, 0) },
    { id: 2, appearance: appearance(200, 30, 30), group: "red" },
    { id: 3, appearance: appearance(30, 30, 200) },
    { id: 4, appearance: appearance(205, 35, 35), group: "red" },
    { id: 5, appearance: appearance(30, 200, 30) },
    { id: 6, appearance: appearance(210, 40, 40), group: "red" },
  ];
  const original = structuredClone(entries);
  const sorted = sortGalleryImages(entries, "color");
  const positions = sorted.flatMap((image, index) => image.group === "red" ? [index] : []);
  assert.equal(positions.length, 3);
  assert.equal(Math.max(...positions) - Math.min(...positions), 2);
  assert.deepEqual(entries, original);
});
