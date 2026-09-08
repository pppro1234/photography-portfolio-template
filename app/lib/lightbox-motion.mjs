import { MOTION_DELAY, MOTION_DURATION, MOTION_EASE, motionTransition } from "./motion-tokens.mjs";

export const LIGHTBOX_DEPTH_SCALE = 0.98;

export function getLightboxPhotoTransition({ instant = false } = {}) {
  return motionTransition(MOTION_DURATION.surface, { instant, ease: MOTION_EASE.inOut });
}

// Switching a scalar target to one terminal keyframe also interrupts a running
// entrance when the preference changes, even if its destination is unchanged.
export function getLightboxTarget(values, instant = false) {
  return instant ? Object.fromEntries(Object.entries(values).map(([key, value]) => [key, [value]])) : values;
}

// A thumbnail can finish after opening, or already be in the browser cache.
export function observeLightboxPreview(image, onReady) {
  if (!image) return () => {};
  const ready = () => {
    if (image.naturalWidth > 0) onReady(image.currentSrc || image.src);
  };
  image.addEventListener("load", ready);
  if (image.complete) ready();
  return () => image.removeEventListener("load", ready);
}

// Dismiss foreground details first, then the photo, then reveal the overview.
// The scene and scrim finish together, keeping the entire exit within 320ms.
const LIGHTBOX_EXIT = {
  detail: { duration: MOTION_DURATION.feedback, delay: 0 },
  photo: { duration: MOTION_DURATION.control, delay: MOTION_DELAY.paragraph },
  surface: { duration: MOTION_DURATION.surface - MOTION_DURATION.quick, delay: MOTION_DURATION.quick },
};

export function getLightboxExitTransition({ layer = "surface", instant = false } = {}) {
  const { duration, delay } = LIGHTBOX_EXIT[layer];
  return motionTransition(duration, { instant, delay, ease: MOTION_EASE.inOut });
}

// Entry responds quickly; exit waits for the foreground before restoring depth.
export function getLightboxTransition({ isPresent = true, instant = false } = {}) {
  if (!isPresent) return getLightboxExitTransition({ instant });
  return motionTransition(MOTION_DURATION.emphasis, {
    instant, ease: MOTION_EASE.out,
  });
}

// Keep the full document's space while showing only its current viewport.
// A viewport-sized transform also keeps fixed navigation and titles in place.
export function freezeLightboxScene({ stage, scene, content, scrollY, viewportHeight, scrollbarWidth, contentMarginTop = 0 }) {
  if (!stage || !scene || !content) return null;
  const height = stage.getBoundingClientRect().height;
  const previousAttribute = scene.getAttribute("data-lightbox-scene");
  const styles = [
    [stage, ["height", "background-color"]],
    [scene, ["transform", "--lightbox-scene-gutter"]],
    [content, ["margin-top"]],
  ].flatMap(([element, properties]) => properties.map((property) => ({
    element, property, value: element.style.getPropertyValue(property), priority: element.style.getPropertyPriority(property),
  })));

  const updateViewport = (nextHeight) => {
    stage.style.setProperty("height", `${Math.max(height, scrollY + nextHeight)}px`);
  };
  updateViewport(viewportHeight);
  stage.style.setProperty("background-color", "var(--background)");
  scene.style.setProperty("--lightbox-scene-gutter", `${Math.max(0, scrollbarWidth)}px`);
  scene.style.setProperty("transform", "scale(1)");
  scene.setAttribute("data-lightbox-scene", "");
  // Margin keeps fixed descendants relative to the viewport scene. A content
  // transform here would turn the long page into their containing block.
  content.style.setProperty("margin-top", `${contentMarginTop - scrollY}px`);

  return {
    scene,
    updateViewport,
    restore() {
      for (const { element, property, value, priority } of styles) {
        if (value) element.style.setProperty(property, value, priority);
        else element.style.removeProperty(property);
      }
      if (previousAttribute === null) scene.removeAttribute("data-lightbox-scene");
      else scene.setAttribute("data-lightbox-scene", previousAttribute);
    },
  };
}
