import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ExifTool } from "exiftool-vendored";
import sharp from "sharp";
import { isPrivateMetadataTag, readGalleryMetadata, sanitizeGalleryFiles, sanitizeXmp } from "./lib/gallery-metadata.mjs";
import { readCaptureDetails } from "./lib/gallery-capture.mjs";

const xmp = `<x:xmpmeta xmlns:x="adobe:ns:meta/">
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
<rdf:Description rdf:about="" xmlns:d="http://www.uav.com/drone-dji/1.0/"
 xmlns:aux="http://ns.adobe.com/exif/1.0/aux/" xmlns:dc="http://purl.org/dc/elements/1.1/"
 d:GpsLatitude="+47.627682974" d:GpsLongitude="-122.354835978"
 d:AbsoluteAltitude="197.839" d:FlightYawDegree="152.6"
 d:ProductName="Mavic4 Pro L3A" d:LensPosition="172" aux:Lens="Test Lens"
 aux:SerialNumber="PRIVATE-BODY-SERIAL">
 <d:CameraSerialNumber>PRIVATE-CAMERA-SERIAL</d:CameraSerialNumber>
 <d:LocationShown><rdf:Bag><rdf:li d:City="PRIVATE-CITY"/></rdf:Bag></d:LocationShown>
 <dc:title><rdf:Alt><rdf:li xml:lang="x-default">Seattle &amp; light</rdf:li></rdf:Alt></dc:title>
</rdf:Description></rdf:RDF></x:xmpmeta>`;

test("XMP removes private attributes and nested elements in unfamiliar namespaces, preserving camera and editorial fields", () => {
  const { data, removed } = sanitizeXmp(Buffer.from(xmp));
  assert.ok(removed.length >= 7);
  assert.doesNotMatch(data.toString(), /PRIVATE-|47\.627|122\.354|197\.839|152\.6/);
  assert.match(data.toString(), /Mavic4 Pro L3A/);
  assert.match(data.toString(), /LensPosition="172"/);
  assert.match(data.toString(), /Test Lens/);
  assert.match(data.toString(), /Seattle &amp; light/);
  assert.equal(sanitizeXmp(data).data, data);
  assert.equal(isPrivateMetadataTag("LensModel"), false);
  assert.equal(isPrivateMetadataTag("LensSerialNumber"), true);
});

test("malformed XMP is rejected instead of silently dropping metadata", () => {
  assert.throws(() => sanitizeXmp(Buffer.from('<x:xmpmeta xmlns:x="adobe:ns:meta/"><broken></x:xmpmeta>')));
  assert.throws(() => sanitizeXmp(Buffer.from('<!DOCTYPE x><x/>')), /document type/);
});

for (const format of ["jpeg", "png", "webp"]) {
  test(`${format}: real metadata cleanup preserves pixels, ICC, orientation and photo settings, and is idempotent`, async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "gallery-metadata-test-"));
    const exiftool = new ExifTool({ maxProcs: 1, useMWG: false });
    try {
      const file = path.join(directory, `photograph.${format}`);
      const xmpFile = path.join(directory, "source.xmp");
      await sharp({ create: { width: 24, height: 40, channels: 3, background: "#a45237" } })
        .withIccProfile("srgb").toFormat(format).toFile(file);
      await writeFile(xmpFile, xmp);
      await exiftool.write(file, {
        "IFD0:Make": "Test Camera", "IFD0:Model": "Test Body",
        "IFD0:Orientation": 6,
        "ExifIFD:LensModel": "Test Lens", "ExifIFD:SerialNumber": "PRIVATE-EXIF-SERIAL",
        "ExifIFD:LensSerialNumber": "PRIVATE-LENS-SERIAL",
        "ExifIFD:FNumber": 2.8, "ExifIFD:ExposureTime": 1 / 125,
        "ExifIFD:ISO": 400, "ExifIFD:FocalLength": 35,
        "ExifIFD:DateTimeOriginal": "2025:01:02 03:04:05",
        "GPS:GPSLatitude": 47.6, "GPS:GPSLatitudeRef": "N",
        "GPS:GPSLongitude": 122.3, "GPS:GPSLongitudeRef": "W",
        "IFD0:Copyright": "Test Photographer",
        ...(format === "jpeg" ? { "IPTC:City": "PRIVATE-IPTC-CITY", "IPTC:Country-PrimaryLocationName": "PRIVATE-IPTC-COUNTRY" } : {}),
      }, { writeArgs: ["-overwrite_original", "-n", `-XMP<=${xmpFile}`], useMWG: false });
      const before = await readGalleryMetadata(exiftool, file);
      const beforeImage = await sharp(await readFile(file)).metadata();
      const beforePixels = await sharp(await readFile(file)).raw().toBuffer();
      assert.ok(Object.keys(before).some(isPrivateMetadataTag));
      const result = await sanitizeGalleryFiles([file], { workRoot: directory });
      assert.deepEqual(result, { scanned: 1, cleaned: [file] });
      assert.deepEqual((await readCaptureDetails([file])).get(file), {
        camera: "Test Camera Test Body", lens: "Test Lens", aperture: 2.8, exposureTime: 1 / 125, iso: 400,
      });
      const after = await readGalleryMetadata(exiftool, file);
      assert.equal(Object.keys(after).some(isPrivateMetadataTag), false);
      assert.equal(after["IFD0:Make"], "Test Camera");
      assert.equal(after["ExifIFD:LensModel"], "Test Lens");
      assert.equal(after["ExifIFD:ISO"], 400);
      assert.equal(after["ExifIFD:ExposureTime"], 1 / 125);
      assert.equal(after["ExifIFD:DateTimeOriginal"], "2025:01:02 03:04:05");
      assert.equal(after["IFD0:Copyright"], "Test Photographer");
      assert.equal(after["File:ImageDataHash"], before["File:ImageDataHash"]);
      assert.deepEqual(await sharp(await readFile(file)).raw().toBuffer(), beforePixels);
      const afterImage = await sharp(await readFile(file)).metadata();
      assert.deepEqual(afterImage.icc, beforeImage.icc);
      assert.equal(afterImage.orientation, 6);
      assert.match(afterImage.xmp.toString(), /Mavic4 Pro L3A/);
      assert.doesNotMatch((await readFile(file)).toString("latin1"), /PRIVATE-/);
      const cleaned = await readFile(file);
      const modified = (await stat(file)).mtimeMs;
      assert.deepEqual(await sanitizeGalleryFiles([file], { workRoot: directory }), { scanned: 1, cleaned: [] });
      assert.deepEqual(await readFile(file), cleaned);
      assert.equal((await stat(file)).mtimeMs, modified);
      assert.deepEqual((await readdir(directory)).sort(), [`photograph.${format}`, "source.xmp"].sort());
    } finally {
      await exiftool.end();
      await rm(directory, { recursive: true, force: true });
    }
  });
}

test("an invalid later file aborts without replacing earlier images or leaving temporary originals", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "gallery-metadata-failure-"));
  try {
    const file = path.join(directory, "first.jpg");
    const invalid = path.join(directory, "invalid.jpg");
    await sharp({ create: { width: 10, height: 10, channels: 3, background: "red" } })
      .withXmp(xmp).jpeg().toFile(file);
    await writeFile(invalid, "not an image");
    const before = await readFile(file);
    await assert.rejects(sanitizeGalleryFiles([file, invalid], { workRoot: directory }));
    assert.deepEqual(await readFile(file), before);
    assert.deepEqual((await readdir(directory)).sort(), ["first.jpg", "invalid.jpg"]);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
