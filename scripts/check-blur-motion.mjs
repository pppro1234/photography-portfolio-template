import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { MOTION_BLUR, MOTION_DURATION, MOTION_EASE, motionBlur, motionCssVariables, motionRevealTransition, motionTransition } from "../app/lib/motion-tokens.mjs";
import { getAboutRevealAnimation } from "../app/lib/about-motion.mjs";

const source = (path) => readFileSync(new URL(`../app/${path}`, import.meta.url), "utf8");
const rules = (css) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, declarations]) => ({ selector: selector.trim(), declarations }));

const curveAt = ([x1, y1, x2, y2], progress) => {
  const cubic = (t, a, b) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t ** 2 * b + t ** 3;
  let low = 0;
  let high = 1;
  for (let step = 0; step < 40; step++) {
    const t = (low + high) / 2;
    if (cubic(t, x1, x2) < progress) low = t;
    else high = t;
  }
  return cubic((low + high) / 2, y1, y2);
};

test("entrance text stays visibly out of focus midway without increasing the blur radius", () => {
  const transition = motionRevealTransition(MOTION_DURATION.content);
  const midpointOpacity = curveAt(transition.ease, 0.5);
  const midpointBlur = MOTION_BLUR.content * (1 - curveAt(transition.filter.ease, 0.5));
  const previousBlur = MOTION_BLUR.content * (1 - midpointOpacity);
  assert.ok(midpointOpacity > 0.95);
  assert.ok(Math.abs(midpointBlur - 1.5) < 0.001);
  assert.ok(previousBlur < 0.15);
  assert.ok(midpointBlur > previousBlur * 10);
});

test("property-specific focus timing preserves duration, stagger, instant mode and fast exits", () => {
  for (const duration of Object.values(MOTION_DURATION)) {
    for (const instant of [false, true]) {
      const transition = motionRevealTransition(duration, { instant, delay: 120 });
      assert.equal(transition.duration, transition.filter.duration);
      assert.equal(transition.delay, transition.filter.delay);
      assert.equal(transition.duration, instant ? 0 : duration / 1000);
      assert.equal(transition.delay, instant ? 0 : 0.12);
      assert.deepEqual(transition.ease, MOTION_EASE.out);
      assert.deepEqual(transition.filter.ease, MOTION_EASE.inOut);
    }
  }
  assert.deepEqual(motionTransition(MOTION_DURATION.control), { duration: 0.24, delay: 0, ease: MOTION_EASE.out });
  assert.equal(getAboutRevealAnimation().transition.filter.duration, 0.6);
  assert.equal(getAboutRevealAnimation({ order: 5 }).transition.filter.delay, 0.3);
  assert.equal("filter" in getAboutRevealAnimation({ media: true }).transition, false);
});

test("CSS entrances separate focus timing while exits retain their original pacing", () => {
  const navigation = source("navigation.css");
  const gallery = source("gallery.css");
  const separated = /transition-timing-function: var\(--motion-ease-out\), var\(--motion-ease-out\), var\(--motion-ease-in-out\)/;
  assert.match(rules(navigation).find(({ selector }) => selector === '.nav-panel[data-active="true"] .nav-stagger').declarations, separated);
  assert.match(rules(gallery).find(({ selector }) => selector === '.gallery-card:hover .gallery-caption').declarations, separated);
  assert.match(rules(navigation).find(({ selector }) => selector === '.nav-stagger').declarations, /transition-timing-function: var\(--motion-ease-out\)/);
  assert.match(rules(gallery).find(({ selector }) => selector === '.gallery-caption').declarations, /filter var\(--motion-duration-emphasis\) var\(--motion-ease-out\)/);
});

test("blur strength is shared between CSS and Motion, with a smaller glyph role", () => {
  assert.deepEqual(MOTION_BLUR, { content: 3, control: 2 });
  for (const [role, radius] of Object.entries(MOTION_BLUR)) {
    assert.equal(motionCssVariables[`--motion-blur-${role}`], `${radius}px`);
    assert.equal(motionBlur(radius), `blur(${radius}px)`);
  }
});

test("scroll blur is bounded, continuous, reversible and removes the filter at the clear endpoint", () => {
  assert.equal(motionBlur(3, 0), "none");
  assert.equal(motionBlur(3, -1), "none");
  assert.equal(motionBlur(3, 2), "blur(3px)");
  assert.equal(motionBlur(3, 0.5), "blur(1.5px)");
  const ascending = Array.from({ length: 101 }, (_, i) => motionBlur(3, i / 100));
  const descending = Array.from({ length: 101 }, (_, i) => motionBlur(3, (100 - i) / 100));
  assert.deepEqual(ascending, descending.reverse());
});

test("home navigation and category headings share the existing subtitle motion without changing its range", () => {
  const provider = source("components/IntroMotionProvider.js");
  assert.match(provider, /motionBlur\(MOTION_BLUR.content, clampProgress\(scroll \/ bounds.distance \/ 0.6\)\)/);
  assert.match(provider, /navigationBlur = useTransform\(navigationOpacity, \(progress\) => motionBlur\(MOTION_BLUR.content, 1 - progress\)\)/);
  assert.match(source("components/SiteHeader.js"), /filter: isHome && !shouldReduceMotion \? navigationBlur : "none"/);
  assert.match(source("components/Intro.js"), /<motion.h1 style=\{\{[^}]*filter: shouldReduceMotion \? "none" : subtitleBlur/);
});

test("About blurs text only and clears it immediately for reduced motion or focus", () => {
  const text = getAboutRevealAnimation();
  assert.equal(text.hidden.filter, motionBlur());
  assert.equal(text.visible.filter, "none");
  assert.equal(getAboutRevealAnimation({ instant: true }).hidden.filter, "none");
  const media = getAboutRevealAnimation({ media: true });
  assert.equal("filter" in media.hidden, false);
  assert.equal("filter" in media.visible, false);
  const component = source("components/AboutReveal.js");
  assert.match(component, /<motion.figcaption[^]*variants=\{\{ hidden: \{ filter:/);
  assert.match(source("about/page.js"), /<AboutCaption>\{about.imageCaption\}<\/AboutCaption>/);
  assert.match(source("about/page.js"), /noscript[^]*filter:none!important/);
  assert.match(source("about/page.js"), /\.about-reveal \.motion-blur-content\{filter:none!important\}/);
  assert.match(source("globals.css"), /\.about-reveal\[data-reveal-focused\][^{]*\{[^}]*filter: none !important/);
});

test("menu blur belongs to text rows, with the existing short crossfade and no filtered surface", () => {
  const css = source("navigation.css");
  assert.match(css, /\.nav-stagger \{[^}]*filter: blur\(var\(--motion-blur-content\)\);[^}]*transition-property: opacity, transform, filter/);
  assert.match(css, /\.nav-panel\[data-active="true"\] \.nav-stagger \{[^}]*filter: none/);
  assert.match(css, /\[data-phase="switching"\] \.nav-stagger \{ opacity: 1; transform: none; transition: filter var\(--panel-crossfade-duration\) var\(--motion-ease-in-out\)/);
  for (const { selector, declarations } of rules(css)) {
    if (/\.(?:nav-panel|nav-panel-inner|nav-expander|nav-curtain)$/.test(selector)) {
      assert.doesNotMatch(declarations, /(?:^|;)\s*filter:/, selector);
    }
  }
});

test("keyboard focus bypasses both panel transparency and text blur without exposing inactive menus", () => {
  const css = source("navigation.css");
  assert.match(css, /\.nav-panel\[data-active="true"\]:has\(:focus-visible\) \{ opacity: 1; transition: none/);
  assert.match(css, /\.nav-panel\[data-active="true"\] \.nav-stagger:focus-visible \{ opacity: 1; transform: none; filter: none; transition: none/);
  assert.match(source("globals.css"), /\.motion-blur-content:has\(:focus-visible\)[^{]*\{ filter: none !important/);
});

test("theme glyphs overlap without layout shifts and still follow the saved preference before hydration", () => {
  const css = source("navigation.css");
  assert.match(css, /\.theme-icon \{ grid-area: 1 \/ 1; opacity: 0; filter: blur\(var\(--motion-blur-control\)\)/);
  assert.match(css, /:root:not\(\[data-theme\]\) \.theme-icon-system, :root\[data-theme="light"\] \.theme-icon-light, :root\[data-theme="dark"\] \.theme-icon-dark \{ opacity: 1; filter: none/);
  assert.match(css, /\.theme-switch\[data-theme-motion="true"\] \.theme-icon \{ transition: opacity/);
  const component = source("components/ThemeSwitch.js");
  assert.match(component, /event.currentTarget.setAttribute\("data-theme-motion", "true"\)/);
  assert.match(component, /<Monitor[^]*<Sun[^]*<Moon/);
  assert.doesNotMatch(source("lib/color-theme.mjs"), /motionBlur|MOTION_BLUR/);
});

test("focused theme glyphs remain exclusive rather than making all three icons visible", () => {
  const css = source("navigation.css");
  const focused = rules(css).find(({ selector }) => selector === ".theme-switch:focus-visible .theme-icon");
  assert.match(focused.declarations, /filter: none; transition: none/);
  assert.doesNotMatch(focused.declarations, /opacity:/);
});

test("lightbox keeps foreground blur on captions and glyphs while the backdrop only blurs the page behind", () => {
  const component = source("components/ImageLightbox.js");
  assert.match(component, /initial=\{\{ opacity: 0, y: shouldReduceMotion \? 0 : 18, filter: textBlur/);
  assert.equal((component.match(/<motion.span className="lightbox-control-glyph" \{\.\.\.glyphMotion\}/g) || []).length, 3);
  const photograph = source("components/LightboxPhoto.js");
  assert.doesNotMatch(photograph, /filter:/);
  assert.match(source("gallery.css"), /backdrop-filter: blur\(var\(--lightbox-backdrop-blur\)\)/);
  assert.match(source("gallery.css"), /\.lightbox-control:focus-visible \.lightbox-control-glyph \{ filter: none !important/);
});

test("gallery blur affects hover captions, not photographs or their continuous springs", () => {
  const css = source("gallery.css");
  assert.match(css, /\.gallery-caption \{[^}]*filter: blur\(var\(--motion-blur-content\)\)/);
  assert.match(css, /\.gallery-card:hover \.gallery-caption \{[^}]*filter: none/);
  assert.match(css, /\.gallery-card:focus-within \.gallery-caption \{[^}]*filter: none; transition: none/);
  for (const component of ["GalleryCardMotion.js", "GalleryController.js", "ImageCard.js"]) {
    assert.doesNotMatch(source(`components/${component}`), /motionBlur|\bfilter:/);
  }
});

test("reduced motion clears every added filter and no permanent filter promotion is introduced", () => {
  const navigation = source("navigation.css");
  assert.match(navigation, /@media \(prefers-reduced-motion: reduce\) \{\s*\.site-nav-brand, \.nav-stagger, \.theme-icon \{ filter: none !important/);
  assert.match(navigation, /\.theme-switch\[data-theme-motion="true"\] \.theme-icon \{ transition: none/);
  assert.match(source("gallery.css"), /\.gallery-caption, \.lightbox-control-glyph \{ filter: none !important/);
  assert.match(source("globals.css"), /\.motion-blur-content \{ filter: none !important/);
  assert.doesNotMatch(navigation + source("gallery.css") + source("globals.css"), /will-change:[^;}]*filter/);
});
