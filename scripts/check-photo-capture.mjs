import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { extractCaptureDetails, readCaptureDetails } from "./lib/gallery-capture.mjs";
import { formatExposureTime, getCaptureFields, validateCaptureDetails } from "../app/lib/photo-capture.mjs";
import { validateGalleryImages } from "../app/lib/gallery-data.mjs";

test("camera extraction publishes only the requested fields, including an XMP-only lens", () => {
  assert.deepEqual(extractCaptureDetails({
    "IFD0:Make": "SONY", "IFD0:Model": "ILCE-7RM3",
    "XMP-aux:Lens": "FE 70-300mm F4.5-5.6 G OSS",
    "ExifIFD:FNumber": 7.1, "ExifIFD:ExposureTime": .005, "ExifIFD:ISO": 6400,
    "GPS:GPSLatitude": 47.6, "ExifIFD:SerialNumber": "PRIVATE-SERIAL",
    "ExifIFD:LensSerialNumber": "PRIVATE-LENS", "ExifIFD:DateTimeOriginal": "PRIVATE-DATE",
  }), { camera: "SONY ILCE-7RM3", lens: "FE 70-300mm F4.5-5.6 G OSS", aperture: 7.1, exposureTime: .005, iso: 6400 });
});

test("incomplete or absent EXIF does not invent a camera or lens", () => {
  assert.equal(extractCaptureDetails({}), undefined);
  assert.equal(extractCaptureDetails({ "IFD0:Make": "Sony", "ExifIFD:FocalLength": 70, "ExifIFD:LensID": 123 }), undefined);
  assert.deepEqual(extractCaptureDetails({ "IFD0:Make": "SONY", "IFD0:Model": "Sony ILCE-7RM3", "ExifIFD:FNumber": 0, "ExifIFD:ISO": -1 }), { camera: "Sony ILCE-7RM3" });
  assert.deepEqual(extractCaptureDetails({ "XMP-exif:ISO": 400 }), { iso: 400 });
});

test("standard shutter fractions survive decimal EXIF round-off, with fractional and long exposures readable", () => {
  for (const [seconds, formatted] of [[.06666666667, "1/15 s"], [.005, "1/200 s"], [1 / 8000, "1/8000 s"], [.3, "0.3 s"], [.8, "0.8 s"], [1, "1 s"], [1.6, "1.6 s"], [30, "30 s"]]) {
    assert.equal(formatExposureTime(seconds), formatted);
  }
  for (const value of [0, -1, Infinity, NaN]) assert.equal(formatExposureTime(value), "");
});

test("display uses a consistent order and omits missing fields entirely", () => {
  assert.deepEqual(getCaptureFields({ iso: 500, exposureTime: .06666666667, aperture: 2, camera: "Hasselblad L3D-100c" }).map(({ label, value }) => [label, value]), [
    ["Camera", "Hasselblad L3D-100c"], ["Aperture", "f/2"], ["Shutter", "1/15 s"], ["ISO", "500"],
  ]);
  assert.deepEqual(getCaptureFields(undefined), []);
});

test("capture validation rejects private fields, invalid settings and nontext model values", () => {
  for (const capture of [null, [], {}, { camera: "" }, { camera: {} }, { camera: "Body", gps: 47.6 }, { serial: "private" }, { aperture: 0 }, { exposureTime: NaN }, { iso: 2.5 }]) {
    assert.equal(validateCaptureDetails(capture), false);
    assert.deepEqual(getCaptureFields(capture), []);
  }
});

test("the synchronized public manifest matches the settings in every photograph", async () => {
  const images = JSON.parse(await readFile(new URL("../app/gallery-data.json", import.meta.url), "utf8"));
  const files = images.map(({ src }) => new URL(`../public${src}`, import.meta.url).pathname);
  const captures = await readCaptureDetails(files);
  validateGalleryImages(images);
  images.forEach((image, index) => assert.deepEqual(image.capture, captures.get(files[index]), image.src));
  const fixture = { id: 1, src: "/gallery/example.jpg", width: 1200, height: 800, title: "Example", category: "Photography", description: "", thumbPosition: "center", isWide: true };
  assert.throws(() => validateGalleryImages([{ ...fixture, capture: { camera: "Body", serialNumber: "private" } }]), /capture/);
});
