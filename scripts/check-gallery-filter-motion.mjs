import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getFilterBounds, getFilterMotionStart, getFilterScrollLeft, isGalleryCategoryPath, shouldAnimateSeriesIntro } from "../app/lib/gallery-filter-motion.mjs";
import { galleryCategories, getCategoryHref } from "../app/lib/gallery-categories.mjs";

const source = (path) => readFileSync(new URL(`../app/${path}`, import.meta.url), "utf8");
const target = { x: 220, y: 35, width: 84 };
const previousTarget = { x: 104, y: 35, width: 76 };
const previous = { category: "cityscape", trackWidth: 600, bounds: { x: 145, y: 35, width: 79 } };
const options = { category: "landscape", trackWidth: 600, target, previousTarget, reducedMotion: false };

test("series copy transitions across configured categories, including reverse and interrupted navigation", () => {
  for (const from of galleryCategories) {
    for (const to of galleryCategories) {
      assert.equal(shouldAnimateSeriesIntro({ category: from.slug }, to.slug), from.slug !== to.slug);
      assert.equal(shouldAnimateSeriesIntro({ category: from.slug }, to.slug, true), false);
    }
  }
  for (const category of galleryCategories) {
    for (const previous of [null, { category: "all" }, { category: "unknown" }]) {
      assert.equal(shouldAnimateSeriesIntro(previous, category.slug), false);
    }
    for (const destination of ["all", "unknown", undefined]) {
      assert.equal(shouldAnimateSeriesIntro({ category: category.slug }, destination), false);
    }
  }
});

test("only real category routes retain filter history; home and About clear it", () => {
  for (const { slug } of galleryCategories) assert.ok(isGalleryCategoryPath(getCategoryHref(slug)));
  for (const path of ["/", "/about", "/work/__unknown", "/work", null]) assert.equal(isGalleryCategoryPath(path), false);
  assert.ok(isGalleryCategoryPath("/work/photography"), "legacy categories retain motion history too");
});

test("indicator geometry stays in track coordinates during horizontal scrolling", () => {
  const before = getFilterBounds({ left: 240, bottom: 132, width: 84 }, { left: 20, top: 100 });
  const after = getFilterBounds({ left: 80, bottom: 132, width: 84 }, { left: -140, top: 100 });
  assert.deepEqual(before, target);
  assert.deepEqual(after, target);
});

test("a route change continues from the live interrupted position, not the old label", () => {
  assert.deepEqual(getFilterMotionStart(previous, options), previous.bounds);
});

test("resizing or changed font metrics remeasure the old label", () => {
  assert.deepEqual(getFilterMotionStart(previous, { ...options, trackWidth: 500 }), previousTarget);
});

test("direct loads, repeated selection, absent history and reduced motion land immediately", () => {
  for (const [snapshot, settings] of [
    [null, options],
    [previous, { ...options, category: "cityscape" }],
    [previous, { ...options, reducedMotion: true }],
    [previous, { ...options, previousTarget: null }],
  ]) assert.deepEqual(getFilterMotionStart(snapshot, settings), target);
});

test("mobile scrolling is preserved while bringing an offscreen selected label into view", () => {
  const viewport = { viewportWidth: 300, scrollWidth: 600, target };
  assert.equal(getFilterScrollLeft({ ...viewport, scrollLeft: 100 }), 100);
  assert.equal(getFilterScrollLeft({ ...viewport, scrollLeft: 0 }), 4);
  assert.equal(getFilterScrollLeft({ ...viewport, scrollLeft: 260 }), 220);
  assert.equal(getFilterScrollLeft({ ...viewport, scrollLeft: 400, target: { x: 520, width: 80 } }), 300);
  assert.equal(getFilterScrollLeft({ ...viewport, viewportWidth: 700, scrollLeft: 100 }), 0);
});

test("filter animation preserves server data, native links, gallery resets and the light animation bundle", () => {
  const filters = source("components/GalleryFilters.js");
  assert.doesNotMatch(filters, /["']use client["']/);
  assert.match(filters, /<GalleryFilterMotion activeCategory=\{activeCategory\}>/);
  assert.match(filters, /<Link[^>]*href=\{getCategoryHref\(slug\)\} scroll=\{false\}/);
  assert.match(filters, /aria-current=\{slug === activeCategory \? "page" : undefined\}/);
  const gallery = source("components/Gallery.js");
  assert.match(gallery, /<GalleryController key=\{category\}/);
  assert.match(gallery, /category !== "all" && <GalleryFilters/);
  const motion = source("components/GalleryFilterMotion.js");
  assert.doesNotMatch(motion, /preventDefault|router\.push|setTimeout|layoutId/);
  assert.match(motion, /MOTION_DURATION.surface/);
  assert.match(motion, /animation\.stop\(\)/);
  assert.match(motion, /observer\.disconnect\(\)/);
  assert.match(motion, /media\.removeEventListener\("change", sync\)/);
  assert.match(motion, /useLayoutEffect\(\(\) => \{[\s\S]*if \(!entranceRef\.current \|\| entranceRef\.current\.category !== activeCategory\) \{\s*entranceRef\.current = \{ category: activeCategory, previous: history\.current \}/);
  assert.match(source("components/MotionProvider.js"), /features=\{domAnimation\}/);
});

test("unhydrated pages retain an underline and reduced motion disables new text animations", () => {
  const css = source("gallery.css");
  assert.match(css, /\.gallery-filter\[aria-current="page"\] > span:first-child \{ text-decoration: underline/);
  assert.match(css, /\.gallery-filters\[data-motion-ready="true"\] \.gallery-filter\[aria-current="page"\] > span:first-child \{ text-decoration: none/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\.gallery-filter \{ animation: none !important; transition: none !important/);
});
