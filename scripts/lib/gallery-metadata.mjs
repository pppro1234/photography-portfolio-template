import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFile, lstat, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { ExifTool } from "exiftool-vendored";
import sharp from "sharp";

const XMLNS = "http://www.w3.org/2000/xmlns/";
const readArgs = ["-G1", "-a", "-s", "-n", "-u", "-all", "-ImageDataHash", "-api", "ImageHashType=SHA256"];
const locationNames = new Set([
  "city", "state", "province", "provincestate", "country", "countrycode",
  "countryprimarylocationname", "countryprimarylocationcode", "worldregion",
]);
const identityNames = new Set([
  "ownername", "cameraownername", "imageuniqueid", "bodyuuid", "camerauuid",
  "deviceid", "cameraid", "droneid",
]);

export function isPrivateMetadataTag(tag) {
  const name = tag.split(":").at(-1).replace(/[^a-z0-9]/gi, "").toLowerCase();
  return /gps|serial|latitude|longitude|altitude/.test(name)
    || /^(location|sublocation|geolocation|geotag|flight|gimbal|rtk|homepoint|takeoff)/.test(name)
    || locationNames.has(name) || identityNames.has(name);
}

// Match XML local names, not prefixes or ExifTool's namespace registry: DJI
// exports can use an unregistered namespace with otherwise familiar GPS tags.
export function sanitizeXmp(xmp) {
  if (!xmp) return { data: xmp, removed: [] };
  const source = xmp.toString("utf8");
  if (/<!DOCTYPE/i.test(source)) throw new Error("Unsupported XMP document type.");
  const document = new DOMParser({
    onError() { throw new Error("Malformed XMP metadata."); },
  }).parseFromString(source, "application/xml");
  if (!document.documentElement) throw new Error("Missing XMP document element.");
  const removed = [];
  const visit = (element) => {
    for (const attribute of Array.from(element.attributes)) {
      if (attribute.namespaceURI !== XMLNS && isPrivateMetadataTag(attribute.localName)) {
        removed.push(attribute.name);
        element.removeAttributeNode(attribute);
      }
    }
    for (const child of Array.from(element.childNodes)) {
      if (child.nodeType !== 1) continue;
      if (isPrivateMetadataTag(child.localName)) {
        removed.push(child.nodeName);
        element.removeChild(child);
      } else visit(child);
    }
  };
  visit(document.documentElement);
  return {
    data: removed.length ? Buffer.from(new XMLSerializer().serializeToString(document)) : xmp,
    removed,
  };
}

export async function readGalleryMetadata(exiftool, file) {
  const tags = await exiftool.readRaw(file, { readArgs, useMWG: false });
  if (tags.errors?.length || tags.warnings?.length) {
    throw new Error(`Could not reliably inspect metadata in ${path.basename(file)}: ${[...(tags.errors ?? []), ...(tags.warnings ?? [])].join("; ")}`);
  }
  return tags;
}

const privateTags = (tags) => Object.keys(tags).filter((tag) =>
  tag.includes(":") && !/^(System|File|ExifTool|Composite):/.test(tag) && isPrivateMetadataTag(tag)
);

const protectedTags = (tags) => Object.fromEntries(Object.entries(tags).filter(([tag]) => {
  if (isPrivateMetadataTag(tag) || /^(System|File|ExifTool|Composite):/.test(tag)) return false;
  const name = tag.split(":").at(-1);
  return /^(Make|Model|CameraModelName|ProductName|Lens.*|FocalLength.*|FNumber|Aperture.*|MaxApertureValue|Exposure.*|ShutterSpeed.*|ISO.*|WhiteBalance.*|Orientation|ColorSpace|DateTimeOriginal|CreateDate|ModifyDate|DateCreated|TimeCreated|OffsetTime.*|SubSec.*|Copyright.*|Rights|Creator|Artist|Title|Description)$/.test(name);
}));

async function imageFingerprint(file) {
  const source = await readFile(file);
  const metadata = await sharp(source, { animated: true }).metadata();
  const pixels = await sharp(source, { animated: true }).raw({ depth: "ushort" }).toBuffer();
  return {
    pixels: createHash("sha256").update(pixels).digest("hex"),
    ...Object.fromEntries(["format", "width", "height", "space", "depth", "channels", "orientation", "density", "pages", "pageHeight", "delay", "loop"].map((key) => [key, metadata[key]])),
    icc: metadata.icc?.toString("base64"),
  };
}

// Stage outside public/, verify every candidate, then replace website copies.
// Files without private fields are never rewritten, including on repeated runs.
export async function sanitizeGalleryFiles(files, { workRoot }) {
  const exiftool = new ExifTool({ maxProcs: 1, useMWG: false, ignoreMinorErrors: false });
  let stagingDir;
  const replacements = [];
  try {
    for (const [index, file] of files.entries()) {
      if (!(await lstat(file)).isFile()) throw new Error(`Expected a regular image file: ${file}`);
      const before = await readGalleryMetadata(exiftool, file);
      // Buffer input bypasses libvips' filename cache after atomic replacement.
      const metadata = await sharp(await readFile(file)).metadata();
      const xmp = sanitizeXmp(metadata.xmp);
      const privateBefore = privateTags(before);
      if (!privateBefore.length && !xmp.removed.length) continue;

      stagingDir ??= await mkdtemp(path.join(workRoot, ".gallery-metadata-"));
      const staged = path.join(stagingDir, `${index}${path.extname(file)}`);
      await copyFile(file, staged);
      const edits = { "GPS:all": null };
      for (const tag of privateBefore) {
        if (/^(GPS|XMP[^:]*):/.test(tag)) continue;
        if (!/^[a-z0-9_-]+:[a-z0-9_-]+$/i.test(tag)) throw new Error(`Unsupported private metadata tag: ${tag}`);
        edits[tag] = null;
      }
      const writeArgs = ["-overwrite_original"];
      if (xmp.removed.length) {
        const xmpFile = path.join(stagingDir, `${index}.xmp`);
        await writeFile(xmpFile, xmp.data);
        writeArgs.push(`-XMP<=${xmpFile}`);
      }
      await exiftool.write(staged, edits, { writeArgs, useMWG: false, ignoreMinorErrors: false });

      const after = await readGalleryMetadata(exiftool, staged);
      const afterXmp = sanitizeXmp((await sharp(await readFile(staged)).metadata()).xmp);
      assert.deepEqual(privateTags(after), [], `Private metadata remains in ${path.basename(file)}`);
      assert.deepEqual(afterXmp.removed, [], `Private XMP remains in ${path.basename(file)}`);
      assert.deepEqual(protectedTags(after), protectedTags(before), `Photographic metadata changed in ${path.basename(file)}`);
      assert.ok(before["File:ImageDataHash"], `Cannot verify image data in ${path.basename(file)}`);
      assert.equal(after["File:ImageDataHash"], before["File:ImageDataHash"], "Compressed image data changed");
      assert.deepEqual(await imageFingerprint(staged), await imageFingerprint(file), "Pixels, color profile, orientation, or dimensions changed");
      replacements.push({ file, staged, original: await readFile(file) });
    }
    for (const { file, original } of replacements) {
      assert.ok(original.equals(await readFile(file)), `Image changed during synchronization: ${path.basename(file)}`);
    }
    for (const { file, staged } of replacements) await rename(staged, file);
    return { scanned: files.length, cleaned: replacements.map(({ file }) => file) };
  } finally {
    await exiftool.end();
    if (stagingDir) await rm(stagingDir, { recursive: true, force: true });
  }
}
