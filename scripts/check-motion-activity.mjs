import assert from "node:assert/strict";
import test from "node:test";
import { getCardScrollProgress, observeNearViewport } from "../app/lib/near-viewport.mjs";

const createElement = (top, bottom = top + 100) => ({
  getBoundingClientRect: () => ({ top, bottom }),
});

function mockViewport(t, { height = 800, supportsObserver = true } = {}) {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const previousObserver = Object.getOwnPropertyDescriptor(globalThis, "IntersectionObserver");
  const instances = [];
  const subscriptions = new Set();

  class MockIntersectionObserver {
    constructor(callback, options) {
      this.callback = callback;
      this.options = options;
      this.observed = new Set();
      this.unobserved = [];
      this.disconnectCount = 0;
      instances.push(this);
    }

    observe(element) {
      this.observed.add(element);
    }

    unobserve(element) {
      this.observed.delete(element);
      this.unobserved.push(element);
    }

    disconnect() {
      this.observed.clear();
      this.disconnectCount += 1;
    }

    emit(entries) {
      this.callback(entries);
    }
  }

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { innerHeight: height },
  });
  Object.defineProperty(globalThis, "IntersectionObserver", {
    configurable: true,
    value: supportsObserver ? MockIntersectionObserver : undefined,
  });

  t.after(() => {
    for (const unsubscribe of subscriptions) unsubscribe();
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else delete globalThis.window;
    if (previousObserver) Object.defineProperty(globalThis, "IntersectionObserver", previousObserver);
    else delete globalThis.IntersectionObserver;
  });

  return {
    instances,
    subscribe(element, onChange) {
      const unsubscribe = observeNearViewport(element, onChange);
      subscriptions.add(unsubscribe);
      return () => {
        subscriptions.delete(unsubscribe);
        unsubscribe();
      };
    },
  };
}

test("many cards share one observer and its 300px viewport buffer", (t) => {
  const { instances, subscribe } = mockViewport(t);
  const states = [];
  for (let index = 0; index < 64; index += 1) {
    subscribe(createElement(100), (active) => states.push(active));
  }

  assert.equal(instances.length, 1);
  assert.equal(instances[0].observed.size, 64);
  assert.deepEqual(instances[0].options, { rootMargin: "300px 0px", threshold: 0 });
  assert.equal(states.length, 64);
  assert.ok(states.every((active) => active === true));
});

test("initial activity includes cards within 300px above or below the viewport", (t) => {
  const { subscribe } = mockViewport(t, { height: 800 });
  const cases = [
    { top: 0, bottom: 100, active: true },
    { top: 1100, bottom: 1200, active: true },
    { top: 1101, bottom: 1201, active: false },
    { top: -400, bottom: -300, active: true },
    { top: -401, bottom: -301, active: false },
  ];

  for (const { top, bottom, active } of cases) {
    const states = [];
    subscribe(createElement(top, bottom), (value) => states.push(value));
    assert.deepEqual(states, [active], `Unexpected activity for bounds ${top}..${bottom}`);
  }
});

test("observer entries update the matching card when it enters and exits", (t) => {
  const { instances, subscribe } = mockViewport(t);
  const card = createElement(1600);
  const unrelated = createElement(1700);
  const states = [];
  const unrelatedStates = [];
  subscribe(card, (active) => states.push(active));
  subscribe(unrelated, (active) => unrelatedStates.push(active));

  instances[0].emit([{ target: card, isIntersecting: true }]);
  instances[0].emit([{ target: card, isIntersecting: false }]);

  assert.deepEqual(states, [false, true, false]);
  assert.deepEqual(unrelatedStates, [false]);
});

test("unsubscribing ignores queued entries and the final card disconnects the observer", (t) => {
  const { instances, subscribe } = mockViewport(t);
  const first = createElement(1600);
  const second = createElement(1700);
  const firstStates = [];
  const secondStates = [];
  const stopFirst = subscribe(first, (active) => firstStates.push(active));
  const stopSecond = subscribe(second, (active) => secondStates.push(active));
  const observer = instances[0];

  stopFirst();
  assert.deepEqual(observer.unobserved, [first]);
  assert.equal(observer.disconnectCount, 0);
  assert.equal(observer.observed.size, 1);
  observer.emit([
    { target: first, isIntersecting: true },
    { target: second, isIntersecting: true },
  ]);
  assert.deepEqual(firstStates, [false]);
  assert.deepEqual(secondStates, [false, true]);

  stopSecond();
  observer.emit([{ target: second, isIntersecting: false }]);
  assert.deepEqual(secondStates, [false, true]);
  assert.deepEqual(observer.unobserved, [first, second]);
  assert.equal(observer.observed.size, 0);
  assert.equal(observer.disconnectCount, 1);
});

test("subscribing after all cards unmount creates a fresh observer", (t) => {
  const { instances, subscribe } = mockViewport(t);
  const stop = subscribe(createElement(50), () => {});
  const firstObserver = instances[0];
  stop();

  const nextCard = createElement(1600);
  const states = [];
  subscribe(nextCard, (active) => states.push(active));
  assert.equal(firstObserver.disconnectCount, 1);
  assert.equal(instances.length, 2);
  assert.notEqual(instances[1], firstObserver);
  assert.ok(instances[1].observed.has(nextCard));
  instances[1].emit([{ target: nextCard, isIntersecting: true }]);
  assert.deepEqual(states, [false, true]);
});

test("browsers without IntersectionObserver keep animations active", (t) => {
  const { instances, subscribe } = mockViewport(t, { supportsObserver: false });
  const states = [];
  const stop = subscribe(createElement(5000), (active) => states.push(active));
  assert.deepEqual(states, [true]);
  assert.equal(instances.length, 0);
  assert.doesNotThrow(stop);
});

test("card scroll progress includes nested offset parents and both endpoint offsets", () => {
  const outer = { offsetTop: 100, offsetParent: null };
  const parent = { offsetTop: 500, offsetParent: outer };
  const card = { offsetTop: 120, offsetParent: parent, clientHeight: 400 };

  assert.equal(getCardScrollProgress(card, -80, 800), 0);
  assert.equal(getCardScrollProgress(card, 520, 800), 0.5);
  assert.equal(getCardScrollProgress(card, 1120, 800), 1);
});

test("progress uses restored scroll immediately and clamps offscreen cards", () => {
  const card = { offsetTop: 1200, offsetParent: null, clientHeight: 600 };

  assert.equal(getCardScrollProgress(card, 0, 800), 0);
  assert.equal(getCardScrollProgress(card, 1100, 800), 0.5);
  assert.equal(getCardScrollProgress(card, 2400, 800), 1);
  // A different viewport height must also use the current geometry immediately.
  assert.equal(getCardScrollProgress(card, 1200, 600), 0.5);
});
