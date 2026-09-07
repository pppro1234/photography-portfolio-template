import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateGalleryImages } from "../app/lib/gallery-data.mjs";

const currentImages = JSON.parse(
  await readFile(new URL("../app/gallery-data.json", import.meta.url), "utf8")
);
const validImage = {
  id: 1,
  src: "/gallery/example.jpg",
  width: 1200,
  height: 800,
  title: "Example",
  category: "Landscape",
  description: "A gallery image.",
  thumbPosition: "center 50%",
  isWide: true,
};

test("current gallery validates without changing metadata, layout, or order", () => {
  const original = structuredClone(currentImages);
  assert.equal(validateGalleryImages(currentImages), currentImages);
  assert.deepEqual(currentImages, original);
});

test("an empty gallery is allowed", () => {
  const images = [];
  assert.equal(validateGalleryImages(images), images);
});

test("empty descriptions and nested local paths are allowed", () => {
  const images = [{ ...validImage, src: "/gallery/series/example.jpg", description: "" }];
  assert.equal(validateGalleryImages(images), images);
});

test("non-array data and non-object entries are rejected", () => {
  for (const data of [null, {}, "gallery"]) {
    assert.throws(() => validateGalleryImages(data), /Gallery data must be an array/);
  }
  for (const image of [null, [], "image"]) {
    assert.throws(() => validateGalleryImages([image]), /Gallery item 1: expected an image object/);
  }
});

test("ids must be positive integers", () => {
  for (const id of [undefined, 0, -1, 1.5, "1", Infinity, NaN]) {
    assert.throws(
      () => validateGalleryImages([{ ...validImage, id }]),
      /Gallery item 1 \(id .*\): id must be a positive integer/
    );
  }
});

test("duplicate ids identify the conflicting item", () => {
  assert.throws(
    () => validateGalleryImages([validImage, { ...validImage, src: "/gallery/another.jpg" }]),
    /Gallery item 2 \(id 1\): id must be unique/
  );
});

test("image sources stay within the local gallery directory", () => {
  for (const src of [
    undefined, "", "/gallery/", "/other/example.jpg", "gallery/example.jpg",
    "https://example.com/gallery/photo.jpg", "//example.com/gallery/photo.jpg",
    "/gallery/../private.jpg", "/gallery/%2e%2e/private.jpg", "/gallery/./photo.jpg",
    "/gallery/photo.jpg?width=100", "/gallery/photo.jpg#preview", "/gallery/bad%path.jpg",
    "/gallery/\\photo.jpg",
  ]) {
    assert.throws(
      () => validateGalleryImages([{ ...validImage, src }]),
      /Gallery item 1 \(id 1\): src must be a local image path under \/gallery\//
    );
  }
});

test("image dimensions must be positive integers", () => {
  for (const field of ["width", "height"]) {
    for (const value of [undefined, 0, -1, 12.5, "1200", Infinity, NaN]) {
      assert.throws(
        () => validateGalleryImages([{ ...validImage, [field]: value }]),
        new RegExp(`${field} must be a positive integer`)
      );
    }
  }
});

test("display metadata must have the expected types", () => {
  for (const field of ["title", "category", "thumbPosition"]) {
    for (const value of [undefined, "", "  ", 12]) {
      assert.throws(
        () => validateGalleryImages([{ ...validImage, [field]: value }]),
        new RegExp(`${field} must be a nonempty string`)
      );
    }
  }
  assert.throws(
    () => validateGalleryImages([{ ...validImage, description: undefined }]),
    /description must be a string/
  );
  assert.throws(
    () => validateGalleryImages([{ ...validImage, isWide: "true" }]),
    /isWide must be a boolean/
  );
});
