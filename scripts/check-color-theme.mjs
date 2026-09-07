import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { applyTheme, nextTheme, normalizeTheme, readTheme, resolveTheme, saveTheme, THEME_STORAGE_KEY, themeInitScript } from "../app/lib/color-theme.mjs";

const source = (path) => readFileSync(new URL(`../app/${path}`, import.meta.url), "utf8");
const globals = source("globals.css");
const lightBlock = globals.match(/:root\s*\{([^}]+)\}/)[1];
const darkBlock = globals.match(/@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme="light"\]\)\s*\{([^}]+)\}/)[1];
const values = (block) => Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, key, value]) => [key, value]));
const light = values(lightBlock);
const dark = { ...light, ...values(darkBlock) };

test("system dark mode uses true black without changing the light palette", () => {
  assert.equal(light["--background"], "#ffffff");
  assert.equal(light["--foreground"], "#171717");
  assert.equal(light["--work-foreground"], "#000000");
  assert.equal(dark["--work-foreground"], "#f5f5f7");
  assert.equal(light["--nav-surface"], "#fafafc");
  assert.equal(dark["--background"], "#000000");
  assert.equal(dark["--nav-surface"], "#000000");
  assert.equal(dark["--lightbox-backdrop"], "#000000");
  assert.match(lightBlock, /color-scheme: light;/);
  assert.match(darkBlock, /color-scheme: dark;/);
  assert.match(globals, /html \{ background: var\(--background\)/);
});

test("text and navigation retain readable contrast in both palettes", () => {
  const luminance = (hex) => {
    const rgb = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
    return rgb.map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
      .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  };
  for (const palette of [light, dark]) {
    for (const background of ["--background", "--nav-surface"]) {
      for (const ink of ["--foreground", "--muted", "--ink-strong", "--ink-secondary", "--ink-hover", "--ink-link-hover", "--ink-caption"]) {
        const a = luminance(palette[background]);
        const b = luminance(palette[ink]);
        assert.ok((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5, `${background} / ${ink}`);
      }
    }
  }
  assert.equal(dark["--filter-count-opacity"], "1");
});

test("gallery surfaces and keyboard focus do not retain white fills or black rings", () => {
  const work = source("components/WorkPage.js");
  const card = source("components/GalleryCardMotion.js");
  const gallery = source("gallery.css");
  assert.match(work, /bg-background/);
  assert.match(work, /work-page/);
  assert.match(gallery, /\.work-page \{ color: var\(--work-foreground\)/);
  assert.doesNotMatch(work, /bg-white|text-black|selection:bg-black/);
  assert.doesNotMatch(card, /bg-neutral-100|ring-black|ring-offset/);
  assert.match(gallery, /\.gallery-card-button:focus-visible \{ outline: 2px solid var\(--ink-hover\); outline-offset: 4px;/);
  assert.match(gallery, /\.gallery-card-button \{ background: var\(--photo-placeholder\)/);
});

test("navigation, About, and selection consume shared theme colors", () => {
  const navigation = source("navigation.css");
  assert.doesNotMatch(navigation, /#[\da-f]{3,8}\b|rgb\(/i);
  for (const token of ["--nav-glass", "--nav-surface", "--nav-scrim", "--ink-secondary", "--ink-hover", "--background", "--foreground"]) {
    assert.ok(navigation.includes(`var(${token})`), token);
  }
  assert.match(globals, /\.about-description \{ color: var\(--muted\)/);
  assert.match(globals, /::selection \{ background: var\(--selection-background\); color: var\(--selection-foreground\)/);
  assert.match(source("footer.css"), /box-shadow: inset 0 1px 0 var\(--footer-separator\)/);
});

test("theme follows system CSS directly and does not invert photographs", () => {
  const layout = source("layout.js");
  assert.match(layout, /colorScheme: "light dark"/);
  assert.match(layout, /media: "\(prefers-color-scheme: light\)", color: "#ffffff"/);
  assert.match(layout, /media: "\(prefers-color-scheme: dark\)", color: "#000000"/);
  assert.doesNotMatch(layout, /useEffect|useState/);
  assert.match(layout, /<html[^>]+suppressHydrationWarning>/);
  assert.match(layout, /<head><script id="theme-init" dangerouslySetInnerHTML/);
  assert.doesNotMatch(darkBlock, /(?:^|[;\s])filter:|invert\(|brightness\(/);
  assert.doesNotMatch(source("components/ImageCard.js"), /invert|brightness|grayscale/);
  assert.match(source("components/ImageLightbox.js"), /image-lightbox[^"\n]*text-white/);
});

test("manual dark and system dark use exactly the same palette", () => {
  const explicit = globals.match(/:root\[data-theme="dark"\]\s*\{([^}]+)\}/)[1];
  assert.deepEqual(values(explicit), values(darkBlock));
  assert.match(source("not-found.js"), /className="not-found-page"/);
});

test("all three preferences cycle, with the first click visibly changing system mode", () => {
  for (const systemDark of [false, true]) {
    const first = nextTheme("system", systemDark);
    assert.notEqual(resolveTheme(first, systemDark), resolveTheme("system", systemDark));
    const second = nextTheme(first, systemDark);
    assert.notEqual(first, second);
    assert.equal(nextTheme(second, systemDark), "system");
    assert.equal(resolveTheme("dark", systemDark), "dark");
    assert.equal(resolveTheme("light", systemDark), "light");
  }
  for (const value of [null, undefined, "", "invalid", 1]) assert.equal(normalizeTheme(value), "system");
});

function fakeDocument() {
  const attributes = new Map();
  const metas = ["light", "dark"].map((mode) => {
    const data = { media: `(prefers-color-scheme: ${mode})`, content: mode === "dark" ? "#000000" : "#ffffff" };
    return { getAttribute: (key) => data[key], setAttribute: (key, value) => { data[key] = value; } };
  });
  return { attributes, metas, documentElement: {
    setAttribute: (key, value) => attributes.set(key, value),
    removeAttribute: (key) => attributes.delete(key),
  }, querySelectorAll: () => metas };
}

test("saved preference is validated and System removes only the theme key", () => {
  const data = new Map([["unrelated", "preserved"]]);
  const storage = { getItem: (key) => data.get(key), setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) };
  assert.equal(readTheme(storage), "system");
  saveTheme(storage, "dark");
  assert.equal(readTheme(storage), "dark");
  saveTheme(storage, "system");
  assert.equal(data.has(THEME_STORAGE_KEY), false);
  assert.equal(data.get("unrelated"), "preserved");
  data.set(THEME_STORAGE_KEY, "invalid");
  assert.equal(readTheme(storage), "system");
  const blocked = { getItem() { throw Error("blocked"); }, setItem() { throw Error("blocked"); }, removeItem() { throw Error("blocked"); } };
  assert.equal(readTheme(blocked), "system");
  assert.doesNotThrow(() => saveTheme(blocked, "dark"));
  assert.doesNotThrow(() => saveTheme(blocked, "system"));
});

test("manual theme updates the native browser colors and System restores media variants", () => {
  const document = fakeDocument();
  for (const preference of ["dark", "light"]) {
    applyTheme(document, preference);
    assert.equal(document.attributes.get("data-theme"), preference);
    assert.deepEqual(document.metas.map((meta) => meta.getAttribute("content")), Array(2).fill(preference === "dark" ? "#000000" : "#ffffff"));
  }
  applyTheme(document, "system");
  assert.equal(document.attributes.has("data-theme"), false);
  assert.deepEqual(document.metas.map((meta) => meta.getAttribute("content")), ["#ffffff", "#000000"]);
});

test("pre-paint bootstrap restores the theme and safely handles inaccessible storage", () => {
  for (const preference of ["dark", "light", "system", "invalid", null]) {
    const document = fakeDocument();
    runInNewContext(themeInitScript, { document, localStorage: { getItem: () => preference } });
    assert.equal(document.attributes.get("data-theme"), normalizeTheme(preference) === "system" ? undefined : preference);
    assert.deepEqual(document.metas.map((meta) => meta.getAttribute("content")), ["#ffffff", "#000000"], "React-owned metadata stays unchanged until hydration");
  }
  assert.doesNotThrow(() => runInNewContext(themeInitScript, { document: fakeDocument(), get localStorage() { throw Error("blocked"); } }));
});

test("one accessible switch is shared by desktop and mobile without disturbing navigation state", () => {
  const header = source("components/SiteHeader.js");
  const component = source("components/ThemeSwitch.js");
  const css = source("navigation.css");
  assert.equal((header.match(/<ThemeSwitch\b/g) || []).length, 1);
  assert.match(header, /<\/nav>\s*<ThemeSwitch onInteract=\{\(\) => hoverIntent.cancel\(\)\}/);
  assert.match(component, /aria-label=\{label\}/);
  assert.doesNotMatch(component, /aria-pressed|triggerRef|closeMenu/);
  assert.match(component, /window.addEventListener\("storage", syncStorage\)/);
  assert.match(component, /window.removeEventListener\("storage", syncStorage\)/);
  assert.match(component, /\[preference, pathname, ready\]/);
  assert.match(css, /\.theme-switch \{[^}]*width: 44px; height: 44px;/);
});
