import assert from "node:assert/strict";
import test from "node:test";
import { freezeLightboxScene } from "../app/lib/lightbox-motion.mjs";

function element(height = 0, changes = []) {
  const values = new Map();
  const attributes = new Map();
  return {
    style: {
      getPropertyValue: (key) => values.get(key)?.value || "",
      getPropertyPriority: (key) => values.get(key)?.priority || "",
      setProperty(key, value, priority = "") { values.set(key, { value, priority }); changes.push(key); },
      removeProperty(key) { values.delete(key); },
    },
    getBoundingClientRect: () => ({ height }),
    getAttribute: (key) => attributes.get(key) ?? null,
    setAttribute(key, value) { attributes.set(key, value); changes.push(key); },
    removeAttribute(key) { attributes.delete(key); },
  };
}

function fixture({ scrollY = 3200, height = 6400, viewportHeight = 900, contentMarginTop = 0 } = {}) {
  const changes = [];
  const stage = element(height, changes);
  const scene = element(0, changes);
  const content = element(0, changes);
  return { stage, scene, content, scrollY, viewportHeight, scrollbarWidth: 15, contentMarginTop, changes };
}

const css = (node, property) => node.style.getPropertyValue(property);

test("freezing a long page preserves its scroll range before removing the scene from document flow", () => {
  const state = fixture();
  freezeLightboxScene(state);
  assert.ok(state.changes.indexOf("height") < state.changes.indexOf("data-lightbox-scene"));
  assert.equal(css(state.stage, "background-color"), "var(--background)");
  assert.ok(parseFloat(css(state.stage, "height")) >= state.scrollY + state.viewportHeight);
  assert.equal(css(state.scene, "--lightbox-scene-gutter"), "15px");
});

test("the same visible content stays in place at the top, middle and bottom of the overview", () => {
  for (const scrollY of [0, 3200, 5500]) {
    const state = fixture({ scrollY, contentMarginTop: 12 });
    freezeLightboxScene(state);
    const localPhotoY = scrollY + 180;
    const frozenViewportY = localPhotoY + parseFloat(css(state.content, "margin-top"));
    const originalViewportY = localPhotoY + 12 - scrollY;
    assert.equal(frozenViewportY, originalViewportY);
    assert.equal(css(state.content, "transform"), "", "fixed children must keep the viewport scene as their containing block");
  }
});

test("a taller resized viewport does not clamp away the saved scroll position", () => {
  const state = fixture({ scrollY: 5500 });
  const frozen = freezeLightboxScene(state);
  frozen.updateViewport(1200);
  assert.equal(css(state.stage, "height"), "6700px");
  frozen.updateViewport(700);
  assert.equal(css(state.stage, "height"), "6400px");
  assert.equal(css(state.content, "margin-top"), "-5500px");
});

test("normal and interrupted closes restore previous styles without erasing unrelated changes", () => {
  const state = fixture();
  state.stage.style.setProperty("height", "95vh", "important");
  state.stage.style.setProperty("background-color", "white");
  state.content.style.setProperty("margin-top", "12px");
  const frozen = freezeLightboxScene(state);
  state.scene.style.setProperty("transform", "scale(0.989)");
  state.scene.style.setProperty("color", "red");
  frozen.restore();
  assert.equal(css(state.stage, "height"), "95vh");
  assert.equal(state.stage.style.getPropertyPriority("height"), "important");
  assert.equal(css(state.stage, "background-color"), "white");
  assert.equal(css(state.content, "margin-top"), "12px");
  assert.equal(css(state.scene, "transform"), "");
  assert.equal(css(state.scene, "--lightbox-scene-gutter"), "");
  assert.equal(css(state.scene, "color"), "red");
  assert.equal(state.scene.getAttribute("data-lightbox-scene"), null);
  frozen.restore();
  assert.equal(css(state.stage, "height"), "95vh");
});

test("a missing scene falls back without partially freezing the page", () => {
  const state = fixture();
  assert.equal(freezeLightboxScene({ ...state, scene: null }), null);
  assert.deepEqual(state.changes, []);
});
