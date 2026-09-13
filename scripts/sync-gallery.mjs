import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readPhotograph } from "./lib/gallery-appearance.mjs";
import { sanitizeGalleryFiles } from "./lib/gallery-metadata.mjs";
import { readCaptureDetails } from "./lib/gallery-capture.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const galleryDir = path.join(rootDir, "public", "gallery");
const dataFile = path.join(rootDir, "app", "gallery-data.json");
const supportedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);

const toPosixPath = (value) => value.split(path.sep).join("/");

const titleFromFilename = (filename) => {
  const withoutExtension = filename.replace(/\.[^.]+$/, "");
  const withoutWebSuffix = withoutExtension.replace(/[_-]web$/i, "");
  const spaced = withoutWebSuffix
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+\d+$/g, "")
    .trim();

  if (!spaced) return "Untitled";

  return spaced
    .split(/\s+/)
    .map((word) => {
      if (/^[A-Z]{2,}$/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
};

const readExistingData = async () => {
  try {
    const contents = await readFile(dataFile, "utf8");
    const parsed = JSON.parse(contents);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
};

const walkImages = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkImages(absolutePath)));
      continue;
    }

    if (supportedExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(absolutePath);
    }
  }

  return files;
};

const syncGallery = async () => {
  const existingItems = await readExistingData();
  const existingBySrc = new Map(existingItems.map((item) => [item.src, item]));
  const existingOrder = new Map(existingItems.map((item, index) => [item.src, index]));
  const maxExistingId = existingItems.reduce(
    (maxId, item) => Math.max(maxId, Number(item.id) || 0),
    0
  );
  let nextId = maxExistingId + 1;

  const files = (await walkImages(galleryDir)).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
  );

  const metadata = await sanitizeGalleryFiles(files, { workRoot: rootDir });
  console.log(`Metadata checked: ${metadata.scanned}. Cleaned: ${metadata.cleaned.length}.`);
  for (const file of metadata.cleaned) console.log(`Cleaned: ${toPosixPath(path.relative(galleryDir, file))}`);
  const captures = await readCaptureDetails(files);

  const imageItems = [];
  for (const filePath of files) {
    const relativePath = toPosixPath(path.relative(galleryDir, filePath));
    const src = `/gallery/${relativePath}`;
    const previous = existingBySrc.get(src);
    const { width, height, appearance } = await readPhotograph(filePath);

    imageItems.push({
      id: previous?.id ?? nextId++,
      src,
      width,
      height,
      title: previous?.title || titleFromFilename(path.basename(filePath)),
      category: previous?.category || "Photography",
      description: previous?.description || "",
      thumbPosition: previous?.thumbPosition || "center",
      isWide: width >= height,
      appearance,
      ...(captures.get(filePath) ? { capture: captures.get(filePath) } : {}),
    });
  }

  imageItems.sort((a, b) => {
    const orderA = existingOrder.has(a.src) ? existingOrder.get(a.src) : Infinity;
    const orderB = existingOrder.has(b.src) ? existingOrder.get(b.src) : Infinity;
    if (orderA !== orderB) return orderA - orderB;
    return a.src.localeCompare(b.src, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });

  await writeFile(dataFile, `${JSON.stringify(imageItems, null, 2)}\n`);

  const previousSources = new Set(existingItems.map((item) => item.src));
  const currentSources = new Set(imageItems.map((item) => item.src));
  const added = imageItems.filter((item) => !previousSources.has(item.src)).length;
  const removed = existingItems.filter((item) => !currentSources.has(item.src)).length;

  console.log(
    `Synced ${imageItems.length} image${imageItems.length === 1 ? "" : "s"} to app/gallery-data.json`
  );
  console.log(`Added: ${added}. Removed: ${removed}.`);
};

syncGallery().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
