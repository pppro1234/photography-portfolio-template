import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getAboutRevealAnimation } from "../app/lib/about-motion.mjs";

test("About uses personal content and the shared social configuration", () => {
  const page = readFileSync(new URL("../app/about/page.js", import.meta.url), "utf8");
  assert.ok(page.includes("resolveAboutContent(config, site"));
  assert.ok(page.includes("contactLinks.map"));
});

test("About text fades in with only a small upward movement", () => {
  const animation = getAboutRevealAnimation();
  assert.deepEqual(animation.hidden, { opacity: 0, y: 10 });
  assert.deepEqual(animation.visible, { opacity: 1, y: 0 });
  assert.equal(animation.transition.duration, 0.6);
});

test("paragraphs enter in order without long accumulated delays", () => {
  let previous = -1;
  for (let order = 0; order <= 6; order++) {
    const { delay } = getAboutRevealAnimation({ order }).transition;
    assert.ok(delay > previous);
    assert.ok(delay <= 0.36);
    previous = delay;
  }
  assert.equal(getAboutRevealAnimation({ order: 100 }).transition.delay, 0.36);
  assert.equal(getAboutRevealAnimation({ order: -10 }).transition.delay, 0);
});

test("photograph reveal only changes opacity, not scale or image processing", () => {
  const animation = getAboutRevealAnimation({ media: true });
  assert.deepEqual(animation.hidden, { opacity: 0, y: 0 });
  assert.deepEqual(animation.visible, { opacity: 1, y: 0 });
  assert.equal(animation.transition.duration, 0.8);
});

test("keyboard focus and reduced motion remove delays and movement time", () => {
  for (const media of [false, true]) {
    const animation = getAboutRevealAnimation({ order: 6, media, instant: true });
    assert.equal(animation.transition.duration, 0);
    assert.equal(animation.transition.delay, 0);
  }
});

test("About retains readable no-JavaScript and reduced-motion fallbacks", () => {
  const page = readFileSync(new URL("../app/about/page.js", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(page, /<noscript><style>\{[^}]*about-reveal/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.about-reveal\s*\{[^}]*opacity: 1 !important/);
  assert.ok(!page.includes('"use client"'));
});

test("keyboard focus immediately overrides an entrance already in progress", () => {
  const component = readFileSync(new URL("../app/components/AboutReveal.js", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(component, /data-reveal-focused=\{focused \? "" : undefined\}/);
  assert.match(component, /onFocusCapture=\{\(\) => setFocused\(true\)\}/);
  assert.match(css, /\.about-reveal:focus-within, \.about-reveal\[data-reveal-focused\]\s*\{[^}]*opacity: 1 !important; transform: none !important/);
});

test("footer stays server-rendered and shares navigation category definitions", () => {
  const footer = readFileSync(new URL("../app/components/Footer.js", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/footer.css", import.meta.url), "utf8");
  assert.ok(!footer.includes('"use client"'));
  assert.match(footer, /\.\.\.galleryCategories/);
  assert.match(footer, /getCategoryHref\(slug\)/);
  assert.ok(footer.includes('href="/about"'));
  assert.ok(footer.includes('rel="noopener noreferrer"'));
  assert.match(css, /\.footer-link:focus-visible \.footer-link-label/);
  assert.match(css, /@media \(hover: hover\) and \(pointer: fine\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test("footer group headings are distinct from links without sacrificing contrast", () => {
  const css = readFileSync(new URL("../app/footer.css", import.meta.url), "utf8");
  const heading = css.match(/\.footer-group-title\s*\{([^}]+)\}/)[1];
  const link = css.match(/\.footer-link\s*\{([^}]+)\}/)[1];
  assert.match(heading, /text-transform: uppercase/);
  assert.match(heading, /letter-spacing: 0\.14em/);
  assert.match(heading, /font-weight: 400/);
  assert.match(heading, /margin-bottom: 20px/);
  const size = (rule) => Number(rule.match(/font-size:\s*([\d.]+)rem/)[1]);
  assert.ok(size(heading) >= 0.75 && size(heading) < size(link));
  const luminance = (rule) => {
    const hex = rule.match(/(?:^|[;\s])color:\s*#([\da-f]{6})/i)[1];
    const linear = [0, 2, 4].map((offset) => {
      const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  };
  assert.match(css, /\.site-footer \{ background: #000/);
  assert.ok((luminance(heading) + 0.05) / 0.05 >= 4.5);
  assert.ok((luminance(link) + 0.05) / 0.05 >= 4.5);
  assert.ok(luminance(link) > luminance(heading) * 2);
  const footer = readFileSync(new URL("../app/components/Footer.js", import.meta.url), "utf8");
  assert.equal((footer.match(/<h4 className="footer-group-title">(?:Work|Studio|Contact)<\/h4>/g) || []).length, 3);
});
