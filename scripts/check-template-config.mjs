import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { getSocialLinks } from "../app/lib/social-platforms.mjs";
import { resolveAboutContent } from "../app/lib/about-content.mjs";
import { filterGalleryImages, galleryCategories } from "../app/lib/gallery-categories.mjs";

const source = (file) => readFileSync(new URL(`../app/${file}`, import.meta.url), "utf8");

test("blank, malformed and unsafe social URLs do not create navigation entries", () => {
  assert.deepEqual(getSocialLinks(), []);
  assert.deepEqual(getSocialLinks({ instagram: "", douyin: " ", xiaohongshu: null }), []);
  for (const href of ["javascript:alert(1)", "/about", "https://", "data:text/plain,hi", "https://user:password@example.com"]) {
    assert.deepEqual(getSocialLinks({ instagram: href }), []);
  }
});

test("one or several configured platforms retain labels, order and exact destinations", () => {
  const one = getSocialLinks({ douyin: "https://www.douyin.com/user/example" });
  assert.equal(one.length, 1);
  assert.equal(one[0].label, "Douyin");
  const all = getSocialLinks({ instagram: "https://www.instagram.com/example/", douyin: "https://www.douyin.com/user/example", xiaohongshu: "https://www.xiaohongshu.com/user/profile/example" });
  assert.deepEqual(all.map(({ label }) => label), ["Instagram", "Douyin", "Xiaohongshu"]);
  assert.equal(all[0].href, "https://www.instagram.com/example/");
});

test("legacy categories fall back without dropping images or changing personal metadata", () => {
  let legacyLabel = "Legacy custom collection";
  while (galleryCategories.some(({ label }) => label === legacyLabel)) legacyLabel += "x";
  const images = [{ id: 1, category: "Photography" }, { id: 2, category: legacyLabel }];
  assert.deepEqual(filterGalleryImages(images, "photography"), images);
  assert.equal(filterGalleryImages(images), images);
  const covered = galleryCategories.flatMap(({ slug }) => filterGalleryImages(images, slug));
  assert.equal(covered.length, 2);
  assert.equal(covered[1], images[1]);
});

test("About follows existing site identity and current photos without fixed sample paths", () => {
  const site = { name: "Test Studio", tagline: "My own words" };
  const image = { id: 1, src: "/gallery/my-photo.jpg", title: "My photo", category: "Photography", width: 900, height: 1200 };
  const second = { ...image, id: 2, src: "/gallery/second.jpg" };
  const content = resolveAboutContent({ statement: "", imageSrc: "" }, site, [image, second]);
  assert.equal(content.name, site.name);
  assert.equal(content.statement, site.tagline);
  assert.equal(content.image, image);
  assert.equal(resolveAboutContent({ imageSrc: second.src }, site, [image, second]).image, second);
  assert.equal(resolveAboutContent({ imageSrc: "/gallery/removed.jpg" }, site, [image]).image, image);
  assert.equal(resolveAboutContent({}, site, []).image, null);
  assert.equal(resolveAboutContent({ statement: "Personal statement" }, site, []).statement, "Personal statement");
});

test("every contact surface hides empty configuration and navigation indices follow content", () => {
  const header = source("components/SiteHeader.js");
  assert.match(header, /const hasContacts = contactLinks.length > 0/);
  assert.ok((header.match(/hasContacts &&/g) || []).length >= 3);
  assert.match(header, /"--item-total": mobileItemTotal/);
  assert.match(header, /renderContacts\(mobileContactStart\)/);
  assert.match(source("components/Footer.js"), /contactLinks.length > 0 &&/);
  assert.match(source("about/page.js"), /contactLinks.length > 0 &&/);
});

test("framework contains no upstream photographer identity or fixed personal picture", () => {
  const files = ["layout.js", "about/page.js", "work/[category]/page.js", ...readdirSync(new URL("../app/components/", import.meta.url)).map((name) => `components/${name}`)];
  for (const file of files) assert.doesNotMatch(source(file), /PPPRO STUDIO|pppro\.studio|gallery\/norway\.jpg/);
  assert.match(source("components/Footer.js"), /new Date\(\).getFullYear\(\)/);
});
