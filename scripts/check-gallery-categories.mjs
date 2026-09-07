import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { filterGalleryImages, galleryCategories, getCategoryHref, getGalleryCategory } from "../app/lib/gallery-categories.mjs";

const images = JSON.parse(await readFile(new URL("../app/gallery-data.json", import.meta.url), "utf8"));

test("all work preserves the original list and ordering", () => {
  assert.equal(filterGalleryImages(images), images);
  assert.equal(filterGalleryImages(images, "all"), images);
});

test("category slugs are unique, safe URL segments and labels are unique", () => {
  assert.equal(new Set(galleryCategories.map(({ slug }) => slug)).size, galleryCategories.length);
  assert.equal(new Set(galleryCategories.map(({ label }) => label)).size, galleryCategories.length);
  for (const category of galleryCategories) {
    assert.match(category.slug, /^[a-z]+(?:-[a-z]+)*$/);
    assert.ok(category.description.length > 0);
    assert.equal(getGalleryCategory(category.slug), category);
    assert.equal(getCategoryHref(category.slug), `/work/${category.slug}`);
  }
  assert.equal(getCategoryHref("all"), "/");
});

test("current photographs belong to exactly one published category", () => {
  const filtered = galleryCategories.flatMap(({ slug }) => filterGalleryImages(images, slug));
  assert.deepEqual(filtered.map(({ id }) => id).sort((a, b) => a - b), images.map(({ id }) => id).sort((a, b) => a - b));
});

test("filtering returns only matching photographs without changing metadata or order", () => {
  const fixture = galleryCategories.flatMap(({ label }, index) => [
    { id: index * 2 + 1, category: label }, { id: index * 2 + 2, category: label },
  ]);
  for (const category of galleryCategories) {
    const expected = fixture.filter((image) => image.category === category.label);
    const result = filterGalleryImages(fixture, category.slug);
    assert.deepEqual(result, expected);
    assert.equal(result[0], expected[0]);
  }
  assert.equal(fixture.length, galleryCategories.length * 2);
});

test("unknown categories cannot silently select all work", () => {
  for (const slug of ["__proto__", "constructor", "Cityscape", "../about"].filter((value) => !getGalleryCategory(value))) {
    assert.equal(getGalleryCategory(slug), undefined);
    assert.deepEqual(filterGalleryImages(images, slug), []);
  }
});

test("empty category and empty gallery return an empty list", () => {
  for (const category of galleryCategories) assert.deepEqual(filterGalleryImages([], category.slug), []);
});
