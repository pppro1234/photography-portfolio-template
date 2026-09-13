import { ExifTool } from "exiftool-vendored";

const text = (value) => typeof value === "string" && !/^(unknown|none|n\/a)$/i.test(value.trim())
  ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 160) : undefined;
const positive = (value) => typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
const first = (tags, keys, normalize) => keys.map((key) => normalize(tags[key])).find(Boolean);

// Only these five photographic details may enter the public gallery manifest.
// Lens model text is used as recorded; focal length and numeric lens IDs are
// not enough to identify a lens and must not be turned into a guessed model.
export function extractCaptureDetails(tags) {
  const make = first(tags, ["IFD0:Make", "XMP-tiff:Make"], text);
  const model = first(tags, ["IFD0:Model", "XMP-tiff:Model"], text);
  const camera = model && (make && !model.toLowerCase().startsWith(make.toLowerCase()) ? `${make} ${model}` : model);
  const values = {
    camera,
    lens: first(tags, ["ExifIFD:LensModel", "XMP-exifEX:LensModel", "XMP-aux:Lens", "XMP-exif:LensModel"], text),
    aperture: first(tags, ["ExifIFD:FNumber", "XMP-exif:FNumber"], positive),
    exposureTime: first(tags, ["ExifIFD:ExposureTime", "XMP-exif:ExposureTime"], positive),
    iso: first(tags, ["ExifIFD:ISO", "XMP-exif:ISO"], (value) => Number.isInteger(value) ? positive(value) : undefined),
  };
  const capture = Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
  return Object.keys(capture).length ? capture : undefined;
}

export async function readCaptureDetails(files) {
  const exiftool = new ExifTool({ maxProcs: 1, useMWG: false });
  const captures = new Map();
  try {
    for (const file of files) {
      const tags = await exiftool.readRaw(file, {
        readArgs: ["-G1", "-a", "-s", "-n", "-Make", "-Model", "-LensModel", "-Lens", "-FNumber", "-ExposureTime", "-ISO"],
        useMWG: false,
      });
      if (tags.errors?.length || tags.warnings?.length) throw new Error(`Could not reliably read camera settings: ${file}`);
      captures.set(file, extractCaptureDetails(tags));
    }
    return captures;
  } finally { await exiftool.end(); }
}
