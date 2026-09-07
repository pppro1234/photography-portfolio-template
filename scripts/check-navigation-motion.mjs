import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHoverIntent, getNavigationDuration, getNavigationPhaseDuration, initialNavigationState, navigationReducer, NAV_HOVER_DELAY, NAV_OPEN_DURATION, NAV_SWITCH_DURATION, NAV_SWITCH_HEIGHT_DURATION } from "../app/lib/navigation-motion.mjs";

test("Work, Contact and mobile About use the same navigation typography", () => {
  const css = readFileSync(new URL("../app/navigation.css", import.meta.url), "utf8");
  const selector = ".nav-work-links a, .nav-contact-links a, .mobile-about-link";
  const blocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const shared = blocks.find(([, selectors, declarations]) => selectors.trim() === selector && declarations.includes("font-size"))?.[2];
  assert.ok(shared);
  for (const declaration of ["font-family: inherit", "font-size: 20px", "font-weight: 300", "line-height: 1.5", "letter-spacing: normal"]) assert.ok(shared.includes(declaration));
  for (const [, selectors, declarations] of blocks) {
    if ((selectors.includes(".nav-work-links a") || selectors.includes(".nav-contact-links a")) && /font(?:-family|-size|-weight)?:|line-height:|letter-spacing:/.test(declarations)) {
      assert.equal(selectors.trim(), selector);
    }
  }
  assert.match(css, /\.site-header \{[^}]*font-family: var\(--font-sans\)/);
  assert.match(css, /\.nav-item \{[^}]*font-family: inherit;[^}]*font-weight: 300;/);
  assert.ok(blocks.some(([, selectors, declarations]) => selectors.trim() === selector && declarations.trim() === "min-height: 44px;"));
});

test("mobile expansion and closing keep their measured 240–480ms timing", () => {
  assert.equal(getNavigationDuration(0), 240);
  assert.equal(getNavigationDuration(340), 240);
  assert.equal(getNavigationDuration(640), 320);
  assert.equal(getNavigationDuration(917), 458.5);
  assert.equal(getNavigationDuration(1600), 480);
  assert.equal(getNavigationDuration(-200), 240);
});

test("opening and closing retain explicit phases for the exit animation", () => {
  const opening = navigationReducer(initialNavigationState, { type: "select", menu: "work" });
  assert.deepEqual(opening, { menu: "work", phase: "opening" });
  const open = navigationReducer(opening, { type: "settle", menu: "work", phase: "opening" });
  assert.equal(open.phase, "open");
  const closing = navigationReducer(open, { type: "select", menu: null });
  assert.deepEqual(closing, { menu: null, phase: "closing" });
  assert.deepEqual(navigationReducer(closing, { type: "settle", menu: null, phase: "closing" }), initialNavigationState);
});

test("switching flyouts uses the crossfade phase instead of replaying entrance stagger", () => {
  assert.deepEqual(navigationReducer({ menu: "work", phase: "open" }, { type: "select", menu: "contact" }), { menu: "contact", phase: "switching" });
});

test("white panel height gets a longer transition than the text crossfade", () => {
  assert.equal(NAV_SWITCH_DURATION, 120);
  assert.equal(NAV_SWITCH_HEIGHT_DURATION, 320);
  assert.equal(getNavigationPhaseDuration("switching", 240), NAV_SWITCH_HEIGHT_DURATION);
  assert.ok(getNavigationPhaseDuration("switching", 240) > NAV_SWITCH_DURATION);
  const css = readFileSync(new URL("../app/navigation.css", import.meta.url), "utf8");
  assert.match(css, /\[data-phase="switching"\] \.nav-expander \{[^}]*transition-duration: var\(--panel-switch-duration\)/);
  assert.match(css, /\[data-phase="switching"\] \.nav-panel \{[^}]*opacity var\(--panel-crossfade-duration\)/);
});

test("desktop opening has its own 440ms rhythm while closing/mobile keep existing timing", () => {
  assert.equal(NAV_OPEN_DURATION, 440);
  assert.equal(getNavigationPhaseDuration("opening", 240), 440);
  assert.equal(getNavigationPhaseDuration("opening", 480, false), 440);
  assert.equal(getNavigationPhaseDuration("opening", 480, true), 480);
  assert.equal(getNavigationPhaseDuration("closing", 480, false), 600);
  assert.equal(getNavigationPhaseDuration("closing", 480, true), 560);
  assert.equal(getNavigationPhaseDuration("closing", 240, false), 440);
});

test("only desktop entrance can overshoot and the viewport bounds the animated panel", () => {
  const css = readFileSync(new URL("../app/navigation.css", import.meta.url), "utf8");
  assert.match(css, /@media \(min-width: 834px\)\s*\{\s*\.site-header\[data-phase="opening"\] \.nav-expander \{[^}]*var\(--motion-duration-emphasis\)[^}]*var\(--motion-ease-panel\)/);
  assert.equal((css.match(/var\(--motion-ease-panel\)/g) || []).length, 1);
  assert.match(css, /\.nav-expander \{[^}]*max-height: calc\(100dvh - var\(--nav-height\)\)/);
  const header = readFileSync(new URL("../app/components/SiteHeader.js", import.meta.url), "utf8");
  assert.match(header, /\[menu, phase, geometry.height, geometry.duration, shouldReduceMotion\]/);
});

test("opening can switch, close and reopen without accepting stale completion events", () => {
  let state = navigationReducer(initialNavigationState, { type: "select", menu: "work" });
  state = navigationReducer(state, { type: "select", menu: "contact" });
  assert.equal(state.phase, "switching");
  state = navigationReducer(state, { type: "select", menu: null });
  assert.equal(state.phase, "closing");
  state = navigationReducer(state, { type: "select", menu: "work" });
  assert.equal(state.phase, "opening");
  assert.equal(navigationReducer(state, { type: "settle", menu: "contact", phase: "switching" }), state);
  assert.equal(navigationReducer(state, { type: "settle", menu: null, phase: "closing" }), state);
});

test("Work to Contact to Work reverses without closing the white panel", () => {
  const contact = navigationReducer({ menu: "work", phase: "open" }, { type: "select", menu: "contact" });
  const work = navigationReducer(contact, { type: "select", menu: "work" });
  assert.deepEqual(work, { menu: "work", phase: "switching" });
  assert.equal(navigationReducer(work, { type: "settle", menu: "contact", phase: "switching" }), work);
  assert.deepEqual(navigationReducer(work, { type: "settle", menu: "work", phase: "switching" }), { menu: "work", phase: "open" });
});

test("closing interrupts a switch and ignores the old switch completion", () => {
  const switching = { menu: "contact", phase: "switching" };
  const closing = navigationReducer(switching, { type: "select", menu: null });
  assert.deepEqual(closing, { menu: null, phase: "closing" });
  assert.equal(navigationReducer(closing, { type: "settle", menu: "contact", phase: "switching" }), closing);
});

test("hovering or clicking an already open flyout does not restart it", () => {
  const state = { menu: "work", phase: "opening" };
  assert.equal(navigationReducer(state, { type: "select", menu: "work" }), state);
});

test("stale settling actions cannot end a newly opened or switching animation", () => {
  const switched = { menu: "contact", phase: "switching" };
  assert.equal(navigationReducer(switched, { type: "settle", menu: "work", phase: "opening" }), switched);
  assert.equal(navigationReducer(switched, { type: "settle", menu: "contact", phase: "opening" }), switched);
  assert.equal(navigationReducer(switched, { type: "settle", menu: null, phase: "closing" }), switched);
});

test("reopening during closing starts an entrance, and a breakpoint reset removes stale state", () => {
  const reopened = navigationReducer({ menu: null, phase: "closing" }, { type: "select", menu: "mobile" });
  assert.deepEqual(reopened, { menu: "mobile", phase: "opening" });
  assert.deepEqual(navigationReducer(reopened, { type: "reset" }), initialNavigationState);
});

function fakeClock() {
  let serial = 0;
  const pending = new Map();
  return {
    pending,
    setTimeout(callback, delay) { const id = ++serial; pending.set(id, { callback, delay }); return id; },
    clearTimeout(id) { pending.delete(id); },
    flush() { const tasks = [...pending.values()]; pending.clear(); tasks.forEach(({ callback }) => callback()); },
  };
}

test("hover waits 120ms and quick crossings select only the last intended menu", () => {
  const clock = fakeClock();
  const selected = [];
  const intent = createHoverIntent((menu) => selected.push(menu), clock);
  intent.schedule("work");
  assert.equal([...clock.pending.values()][0].delay, 120);
  assert.deepEqual(selected, []);
  intent.schedule(null);
  intent.schedule("contact");
  assert.equal(clock.pending.size, 1);
  clock.flush();
  assert.deepEqual(selected, ["contact"]);
});

test("default hover timers retain the browser global receiver", () => {
  const originals = { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout };
  let pending;
  let cancellations = 0;
  const selected = [];
  globalThis.setTimeout = function (callback, delay) {
    assert.equal(this, globalThis, "native browser timers cannot use the injected clock as their receiver");
    assert.equal(delay, NAV_HOVER_DELAY);
    pending = callback;
    return 1;
  };
  globalThis.clearTimeout = function (id) {
    assert.equal(this, globalThis);
    assert.equal(id, 1);
    pending = undefined;
    cancellations++;
  };
  try {
    const intent = createHoverIntent((menu) => selected.push(menu));
    intent.schedule("work");
    intent.schedule("contact");
    assert.equal(cancellations, 1);
    pending();
    assert.deepEqual(selected, ["contact"]);
    intent.schedule("work");
    intent.cancel();
    assert.equal(pending, undefined);
  } finally {
    Object.assign(globalThis, originals);
  }
});

test("pointer exit, Escape, navigation and unmount can cancel a queued hover", () => {
  const clock = fakeClock();
  const selected = [];
  const intent = createHoverIntent((menu) => selected.push(menu), clock);
  intent.schedule("work");
  intent.cancel();
  intent.cancel();
  clock.flush();
  assert.deepEqual(selected, []);
  intent.schedule("contact");
  clock.flush();
  assert.deepEqual(selected, ["contact"]);
});
