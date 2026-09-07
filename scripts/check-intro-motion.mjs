import assert from "node:assert/strict";
import test from "node:test";
import { collapseEasing, getBrandTransform, getIntroGeometry, getNavigationReveal, INTRO_SPRING } from "../app/lib/intro-motion.mjs";

const desktop = getIntroGeometry({ originTop: 144, originLeft: 32, slotLeft: 32, navHeight: 44, availableScroll: 2000 });

test("the pre-navigation spring and collapse curve are preserved", () => {
  assert.deepEqual(INTRO_SPRING, { stiffness: 260, damping: 36, mass: 0.65 });
  assert.equal(collapseEasing(92, 184), 0.75);
  assert.equal(collapseEasing(-30, 184), 0);
  assert.equal(collapseEasing(1000, 184), 1);
});

test("desktop starts in the old 144px hero position at full 30px size", () => {
  assert.deepEqual(getBrandTransform(0, desktop), { x: 0, y: 144, scale: 1 });
  assert.equal(desktop.distance, 184);
});

test("desktop ends at 20px centered in the new 44px navigation", () => {
  const result = getBrandTransform(184, desktop);
  assert.equal(result.x, 0);
  assert.equal(result.y, 10);
  assert.equal(30 * result.scale, 20);
  assert.equal(result.y + 36 * result.scale / 2, 22);
});

test("mobile preserves its original 24px to 18px scale and 128px origin", () => {
  const mobile = getIntroGeometry({ originTop: 128, originLeft: 16, navHeight: 48, desktop: false, availableScroll: 1800 });
  assert.deepEqual(getBrandTransform(0, mobile), { x: 0, y: 128, scale: 1 });
  const result = getBrandTransform(168, mobile);
  assert.equal(result.y, 12);
  assert.equal(24 * result.scale, 18);
  assert.equal(result.y + 32 * result.scale / 2, 24);
});

test("the 768–833px padding mismatch is interpolated instead of jumping sideways", () => {
  const tablet = getIntroGeometry({ originTop: 144, originLeft: 32, slotLeft: 16, navHeight: 48, availableScroll: 1200 });
  assert.equal(getBrandTransform(0, tablet).x, 16);
  assert.equal(getBrandTransform(92, tablet).x, 4);
  assert.equal(getBrandTransform(184, tablet).x, 0);
});

test("short pages can complete their collapse and non-scrollable pages stay finite", () => {
  const short = getIntroGeometry({ originTop: 144, originLeft: 32, availableScroll: 60 });
  assert.equal(short.distance, 60);
  assert.equal(getBrandTransform(60, short).y, 10);
  const noScroll = getIntroGeometry({ originTop: 144, originLeft: 32 });
  assert.equal(noScroll.distance, 184);
  assert.ok(Object.values(getBrandTransform(0, noScroll)).every(Number.isFinite));
});

test("restored scroll positions use exactly the compact endpoint", () => {
  assert.deepEqual(getBrandTransform(1500, desktop), getBrandTransform(184, desktop));
});

test("menus compact the same wordmark and closing returns it to its scroll position", () => {
  assert.deepEqual(getBrandTransform(0, desktop, 1), getBrandTransform(184, desktop));
  assert.deepEqual(getBrandTransform(0, desktop, 0), { x: 0, y: 144, scale: 1 });
  assert.deepEqual(getBrandTransform(184, desktop, 0.5), getBrandTransform(184, desktop));
});

test("intermediate geometry stays continuous, monotonic and within its endpoints", () => {
  let previous = getBrandTransform(0, desktop);
  for (let scroll = 1; scroll <= 184; scroll++) {
    const current = getBrandTransform(scroll, desktop);
    assert.ok(current.y <= previous.y && current.y >= 10);
    assert.ok(current.scale <= previous.scale && current.scale >= 2 / 3);
    previous = current;
  }
});

test("home navigation stays hidden until the wordmark approaches its dock", () => {
  assert.equal(getNavigationReveal(0, desktop), 0);
  assert.equal(getNavigationReveal(desktop.distance * 0.65, desktop), 0);
  assert.ok(getBrandTransform(desktop.distance * 0.65, desktop).y < 27);
  assert.ok(Math.abs(getNavigationReveal(desktop.distance * 0.8, desktop) - 0.5) < 1e-10);
  assert.ok(Math.abs(getNavigationReveal(desktop.distance * 0.95, desktop) - 1) < 1e-10);
  assert.equal(getNavigationReveal(1000, desktop), 1);
});

test("home navigation follows the same smooth reveal in both scroll directions", () => {
  const forward = Array.from({ length: 185 }, (_, scroll) => getNavigationReveal(scroll, desktop));
  assert.ok(forward.every((value, index) => value >= 0 && value <= 1 && (index === 0 || value >= forward[index - 1])));
  for (let scroll = 184; scroll >= 0; scroll--) assert.equal(getNavigationReveal(scroll, desktop), forward[scroll]);
});

test("restoring a scrolled page reveals navigation immediately at the matching progress", () => {
  assert.equal(getNavigationReveal(1500, desktop), 1);
  assert.equal(getNavigationReveal(-20, desktop), 0);
});

test("an open menu retains its controls, then lets them fade on returning to the top", () => {
  assert.equal(getNavigationReveal(0, desktop, 1), 1);
  assert.equal(getNavigationReveal(0, desktop, 0.5), 0.5);
  assert.equal(getNavigationReveal(0, desktop, 0), 0);
  assert.equal(getNavigationReveal(184, desktop, 0), 1);
});

test("mobile and short-page navigation reveal use the measured collapse distance", () => {
  const mobile = getIntroGeometry({ originTop: 128, originLeft: 16, navHeight: 48, desktop: false, availableScroll: 1800 });
  const short = getIntroGeometry({ originTop: 144, originLeft: 32, availableScroll: 60 });
  for (const bounds of [mobile, short]) {
    assert.equal(getNavigationReveal(0, bounds), 0);
    assert.equal(getNavigationReveal(bounds.distance, bounds), 1);
  }
});

test("a page that cannot scroll still exposes a usable compact navigation", () => {
  const noScroll = getIntroGeometry({ originTop: 144, originLeft: 32, availableScroll: 0 });
  assert.equal(getNavigationReveal(0, noScroll), 1);
  assert.deepEqual(getBrandTransform(0, noScroll), { x: 0, y: 10, scale: 2 / 3 });
});
