// Shared by CSS (server-rendered custom properties) and Motion (seconds).
// Role, not page, determines timing. Only panel geometry may overshoot.
export const MOTION_DURATION = Object.freeze({
  quick: 120,
  feedback: 160,
  control: 240,
  surface: 320,
  emphasis: 440,
  content: 600,
  image: 800,
  imageHover: 1000,
});

export const MOTION_DELAY = Object.freeze({
  item: 20,
  paragraph: 60,
  navigation: 80,
  mobile: 200,
});

export const MOTION_EASE = Object.freeze({
  out: Object.freeze([0.22, 1, 0.36, 1]),
  inOut: Object.freeze([0.4, 0, 0.6, 1]),
  in: Object.freeze([0.4, 0, 1, 1]),
  // About 0.54% overshoot: roughly 1–2px for the current desktop panels.
  panel: Object.freeze([0.22, 1.14, 0.36, 1]),
});

// Continuous/physical motion is intentionally distinct from timed UI feedback.
// Preserve the established scroll and photograph behavior exactly.
export const MOTION_SPRING = Object.freeze({
  intro: Object.freeze({ stiffness: 260, damping: 36, mass: 0.65 }),
  galleryScroll: Object.freeze({ stiffness: 150, damping: 24, mass: 0.6 }),
  parallax: Object.freeze({ stiffness: 55, damping: 24, mass: 0.8 }),
  lightbox: Object.freeze({ stiffness: 190, damping: 24, mass: 0.9 }),
});

export function motionTransition(duration, { instant = false, delay = 0, ease = MOTION_EASE.out } = {}) {
  return { duration: instant ? 0 : duration / 1000, delay: instant ? 0 : delay / 1000, ease };
}

const kebab = (name) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
export const motionCssVariables = Object.freeze(Object.fromEntries([
  ...Object.entries(MOTION_DURATION).map(([name, value]) => [`--motion-duration-${kebab(name)}`, `${value}ms`]),
  ...Object.entries(MOTION_DELAY).map(([name, value]) => [`--motion-delay-${kebab(name)}`, `${value}ms`]),
  ...Object.entries(MOTION_EASE).map(([name, value]) => [`--motion-ease-${kebab(name)}`, `cubic-bezier(${value.join(", ")})`]),
]));
