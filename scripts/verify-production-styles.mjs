import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { galleryCategories } from "../app/lib/gallery-categories.mjs";

const build = new URL("../.next/", import.meta.url);

// Check the styles actually linked by prerendered pages, not the source files
// or every cached CSS asset. A successful compile alone missed stale globals.
// Include custom categories and the Photography fallback, not fixed sample routes.
for (const route of ["index", "about", "_not-found", ...galleryCategories.map(({ slug }) => `work/${slug}`)]) {
  const html = await readFile(new URL(`server/app/${route}.html`, build), "utf8");
  const stylesheets = [...html.matchAll(/<link\b[^>]*>/g)]
    .map(([tag]) => tag)
    .filter((tag) => /\brel="stylesheet"/.test(tag))
    .map((tag) => tag.match(/\bhref="([^"]+)"/)?.[1]);
  assert.ok(stylesheets.length, `${route}: no published stylesheets`);
  const css = (await Promise.all(stylesheets.map(async (href) => {
    assert.ok(href?.startsWith("/_next/static/"), `${route}: unexpected CSS path ${href}`);
    return readFile(new URL(href.replace(/^\/_next\//, "").split("?")[0], build), "utf8");
  }))).join("\n");

  for (const [label, pattern] of [
    ["desktop navigation height", /--nav-height:\s*44px/],
    ["mobile navigation height", /--nav-height:\s*48px/],
    ["navigation panel expansion", /\.nav-expander\s*\{[^}]*height:\s*min\(/],
    ["About page spacing", /\.about-page\s*\{[^}]*padding:\s*132px\s+32px\s+112px/],
    ["About desktop layout", /\.about-story\s*\{[^}]*grid-template-columns:\s*1\.05fr\s+1fr/],
    ["About mobile layout", /\.about-story\s*\{[^}]*grid-template-columns:\s*1fr\s*[;}]/],
    ["keyboard reveal fallback", /\.about-reveal[^{}]*\{[^}]*opacity:\s*1\s*!important/],
    ["footer navigation", /\.footer-navigation\s*\{/],
    ["pure-black system theme", /@media\s*\(prefers-color-scheme:\s*dark\)\s*\{\s*:root:not\(\[data-theme=["']?light["']?\]\)\s*\{[^}]*--background:\s*#(?:000000|000)\s*[;}]/],
    ["manual dark theme", /:root\[data-theme=["']?dark["']?\]\s*\{[^}]*--background:\s*#(?:000000|000)\s*[;}]/],
    ["navigation theme switch", /\.theme-switch\s*\{[^}]*width:\s*44px/],
    ["theme-aware navigation panel", /\.nav-expander\s*\{[^}]*background:\s*var\(--nav-surface\)/],
    ["theme-aware keyboard focus", /\.gallery-card-button:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--ink-hover\)/],
    ["category underline motion", /\.gallery-filter-indicator\s*\{[^}]*position:\s*absolute/],
    ["category text transition", /@keyframes gallery-filter-select/],
    ["shared text blur", /\.nav-stagger\s*\{[^}]*filter:\s*blur\(var\(--motion-blur-content\)\)/],
    ["visible entrance focus transition", /\.nav-panel\[data-active=["']?true["']?\]\s*\.nav-stagger\s*\{[^}]*transition-timing-function:\s*var\(--motion-ease-out\),\s*var\(--motion-ease-out\),\s*var\(--motion-ease-in-out\)/],
    ["theme glyph transition", /\.theme-switch\[data-theme-motion=["']?true["']?\]\s*\.theme-icon\s*\{[^}]*transition:\s*opacity/],
  ]) assert.match(css, pattern, `${route}: missing ${label}; stop deployment`);
  assert.match(html, /name="color-scheme" content="light dark"/, `${route}: missing native system theme metadata`);
  assert.match(html, /--motion-blur-content:3px/, `${route}: missing shared text blur strength`);
  assert.match(html, /--motion-blur-control:2px/, `${route}: missing shared glyph blur strength`);
  assert.match(html, /<script id="theme-init">/, `${route}: missing saved-theme bootstrap`);
  const bootstrap = html.match(/<script id="theme-init">([\s\S]*?)<\/script>/);
  assert.ok(bootstrap && html.indexOf(bootstrap[0]) < html.indexOf("</head>"), `${route}: theme must restore before body paint`);
  for (const stored of ["dark", "light", null, "invalid"]) {
    const attributes = new Map();
    runInNewContext(bootstrap[1], {
      localStorage: { getItem: () => stored },
      document: {
        documentElement: { setAttribute: (key, value) => attributes.set(key, value), removeAttribute: (key) => attributes.delete(key) },
        querySelectorAll: () => [],
      },
    });
    assert.equal(attributes.get("data-theme"), stored === "dark" || stored === "light" ? stored : undefined, `${route}: compiled theme bootstrap failed`);
  }
}

console.log("Published styles and theme bootstrap verified for home, About, every configured category, Photography fallback, and 404.");
