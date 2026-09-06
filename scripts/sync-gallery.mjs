import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

const readJpegSize = (buffer) => {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    throw new Error("Invalid JPEG signature");
  }

  let offset = 2;
  const sofMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce,
    0xcf,
  ]);

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    while (buffer[offset] === 0xff) offset += 1;

    const marker = buffer[offset];
    offset += 1;

    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;

    const length = buffer.readUInt16BE(offset);
    if (sofMarkers.has(marker)) {
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      };
    }

    offset += length;
  }

  throw new Error("JPEG dimensions were not found");
};

const readPngSize = (buffer) => {
  const signature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== signature) {
    throw new Error("Invalid PNG signature");
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
};

const readUInt24LE = (buffer, offset) =>
  buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);

const readWebpSize = (buffer) => {
  if (
    buffer.subarray(0, 4).toString("ascii") !== "RIFF" ||
    buffer.subarray(8, 12).toString("ascii") !== "WEBP"
  ) {
    throw new Error("Invalid WebP signature");
  }

  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunkType = buffer.subarray(offset, offset + 4).toString("ascii");
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkData = offset + 8;

    if (chunkType === "VP8X") {
      return {
        width: readUInt24LE(buffer, chunkData + 4) + 1,
        height: readUInt24LE(buffer, chunkData + 7) + 1,
      };
    }

    if (chunkType === "VP8L") {
      const bits = buffer.readUInt32LE(chunkData + 1);
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >> 14) & 0x3fff) + 1,
      };
    }

    if (chunkType === "VP8 ") {
      return {
        width: buffer.readUInt16LE(chunkData + 6) & 0x3fff,
        height: buffer.readUInt16LE(chunkData + 8) & 0x3fff,
      };
    }

    offset += 8 + chunkSize + (chunkSize % 2);
  }

  throw new Error("WebP dimensions were not found");
};

const readImageSize = async (filePath) => {
  const buffer = await readFile(filePath);
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".jpg" || extension === ".jpeg") return readJpegSize(buffer);
  if (extension === ".png") return readPngSize(buffer);
  if (extension === ".webp") return readWebpSize(buffer);

  throw new Error(`Unsupported image type: ${extension}`);
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

  const imageItems = [];
  for (const filePath of files) {
    const relativePath = toPosixPath(path.relative(galleryDir, filePath));
    const src = `/gallery/${relativePath}`;
    const previous = existingBySrc.get(src);
    const { width, height } = await readImageSize(filePath);

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
