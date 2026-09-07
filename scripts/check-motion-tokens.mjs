import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { MOTION_DURATION, MOTION_DELAY, MOTION_EASE, MOTION_SPRING, motionCssVariables, motionTransition } from "../app/lib/motion-tokens.mjs";
import { INTRO_SPRING } from "../app/lib/intro-motion.mjs";

const source = (path) => readFileSync(new URL(`../app/${path}`, import.meta.url), "utf8");
const kebab = (name) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
const bezier = (t, a, b) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t ** 2 * b + t ** 3;

test("CSS and JavaScript share exactly the same duration, delay and curve tokens", () => {
  for (const [name, value] of Object.entries(MOTION_DURATION)) {
    assert.equal(motionCssVariables[`--motion-duration-${kebab(name)}`], `${value}ms`);
    assert.equal(motionTransition(value).duration, value / 1000);
  }
  for (const [name, value] of Object.entries(MOTION_DELAY)) assert.equal(motionCssVariables[`--motion-delay-${kebab(name)}`], `${value}ms`);
  for (const [name, curve] of Object.entries(MOTION_EASE)) assert.equal(motionCssVariables[`--motion-ease-${kebab(name)}`], `cubic-bezier(${curve.join(", ")})`);
  assert.match(source("layout.js"), /<html[^>]*style=\{motionCssVariables\}/);
});

test("all CSS motion variables resolve and inline curves/durations cannot drift", () => {
  for (const filename of readdirSync(new URL("../app/", import.meta.url)).filter((name) => name.endsWith(".css"))) {
    const css = source(filename);
    for (const [, name] of css.matchAll(/var\((--motion-[\w-]+)/g)) assert.ok(name in motionCssVariables, `${filename}: ${name}`);
    assert.doesNotMatch(css, /cubic-bezier\(/, `${filename} should use a shared curve`);
    for (const declaration of css.matchAll(/transition(?:-[\w-]+)?:\s*([^;}]*)/g)) {
      assert.doesNotMatch(declaration[1], /(?:^|\s)[1-9]\d*(?:\.\d+)?m?s\b/, `${filename} should use duration tokens`);
    }
  }
});

test("timed roles are deliberately ordered, not a universal duration", () => {
  assert.deepEqual(Object.values(MOTION_DURATION), [120, 160, 240, 320, 440, 600, 800, 1000]);
  assert.ok(MOTION_DURATION.control < MOTION_DURATION.emphasis);
  assert.ok(MOTION_DURATION.emphasis < MOTION_DURATION.content);
  assert.ok(MOTION_DURATION.content < MOTION_DURATION.imageHover);
});

test("desktop panel has one restrained overshoot while fade/control curves remain bounded", () => {
  for (const [name, [x1, y1, x2, y2]] of Object.entries(MOTION_EASE)) {
    let previousX = 0;
    let max = 0;
    let descending = false;
    let previousY = 0;
    for (let step = 0; step <= 1000; step++) {
      const t = step / 1000;
      const x = bezier(t, x1, x2);
      const y = bezier(t, y1, y2);
      assert.ok(x >= previousX);
      assert.ok(y >= 0);
      max = Math.max(max, y);
      if (y < previousY) descending = true;
      else if (descending) assert.fail(`${name} must not oscillate repeatedly`);
      if (name !== "panel") assert.ok(y <= 1);
      previousX = x;
      previousY = y;
    }
    if (name === "panel") assert.ok(max > 1.004 && max < 1.01);
    else assert.equal(descending, false);
    assert.equal(previousY, 1);
  }
});

test("reduced motion removes every timed duration and delay", () => {
  for (const duration of Object.values(MOTION_DURATION)) {
    const transition = motionTransition(duration, { instant: true, delay: MOTION_DURATION.quick });
    assert.equal(transition.duration, 0);
    assert.equal(transition.delay, 0);
  }
  assert.match(source("gallery.css"), /\.gallery-photo, \.gallery-caption \{ transform: none !important/);
  const lightbox = source("components/ImageLightbox.js");
  assert.match(lightbox, /scale: shouldReduceMotion \? 1 : 0\.82/);
  assert.doesNotMatch(lightbox, /duration:\s*0\.[1-9]/);
});

test("original continuous springs and photograph spring are unchanged", () => {
  assert.deepEqual(MOTION_SPRING, {
    intro: { stiffness: 260, damping: 36, mass: 0.65 },
    galleryScroll: { stiffness: 150, damping: 24, mass: 0.6 },
    parallax: { stiffness: 55, damping: 24, mass: 0.8 },
    lightbox: { stiffness: 190, damping: 24, mass: 0.9 },
  });
  assert.equal(INTRO_SPRING, MOTION_SPRING.intro);
  assert.match(source("components/GalleryController.js"), /useSpring\(scrollY, MOTION_SPRING.galleryScroll\)/);
  assert.match(source("components/GalleryCardMotion.js"), /useSpring\(imageOffset, MOTION_SPRING.parallax\)/);
  assert.match(source("components/ImageLightbox.js"), /\.\.\.MOTION_SPRING.lightbox/);
});

test("lightbox descendants exit with the backdrop instead of retaining invisible interaction locks", () => {
  const lightbox = source("components/ImageLightbox.js");
  assert.match(lightbox, /exit=\{\{ opacity: 0, y: shouldReduceMotion \? 0 : 10, filter: textBlur, transition: motionTransition\(MOTION_DURATION.control, \{ instant: shouldReduceMotion \}\)/);
  assert.match(lightbox, /exit=\{\{ opacity: 0, scale: shouldReduceMotion \? 1 : 0\.92, transition: \{ type: "tween", \.\.\.motionTransition\(MOTION_DURATION.control, \{ instant: shouldReduceMotion \}\)/);
  assert.equal(motionTransition(MOTION_DURATION.control).delay, 0);
});

test("image hover uses scoped properties and keyboard content remains immediately readable", () => {
  const card = source("components/ImageCard.js");
  assert.doesNotMatch(card, /transition-all|duration-\d+|ease-\[/);
  const css = source("gallery.css");
  assert.match(css, /@media \(hover: hover\) and \(pointer: fine\)/);
  assert.match(css, /\.gallery-card:focus-within \.gallery-caption \{[^}]*transition: none/);
});
