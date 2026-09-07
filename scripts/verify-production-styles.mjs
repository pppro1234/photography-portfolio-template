import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const build = new URL("../.next/", import.meta.url);

// Check the styles actually linked by prerendered pages, not the source files
// or every cached CSS asset. A successful compile alone missed stale globals.
for (const route of ["index", "about"]) {
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
  ]) assert.match(css, pattern, `${route}: missing ${label}; stop deployment`);
}

console.log("Published CSS verified for home and About (desktop + mobile).");
