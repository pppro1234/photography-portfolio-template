import { validateCaptureDetails } from "./photo-capture.mjs";

/**
 * @typedef {Object} GalleryImage
 * @property {number} id Stable, unique positive integer.
 * @property {string} src Local image path under /gallery/.
 * @property {number} width Original image width in pixels.
 * @property {number} height Original image height in pixels.
 * @property {string} title Display title.
 * @property {string} category Display category.
 * @property {string} description Description; an empty string is allowed.
 * @property {string} thumbPosition CSS object-position for the thumbnail.
 * @property {boolean} isWide Explicit gallery layout choice.
 * @property {{camera?: string, lens?: string, aperture?: number, exposureTime?: number, iso?: number}} [capture] Available photographic settings; never private EXIF.
 */

const isGalleryPath = (src) => {
  if (typeof src !== "string" || !src.startsWith("/gallery/")) return false;

  try {
    const decoded = decodeURIComponent(src);
    if (/[\\?#\u0000-\u001f\u007f]/.test(decoded)) return false;
    return decoded.slice("/gallery/".length).split("/").every(
      (segment) => segment.trim().length > 0 && segment !== "." && segment !== ".."
    );
  } catch {
    return false;
  }
};

/**
 * Validate gallery data before rendering without changing its content or order.
 * Intended for the server-rendered Gallery and local content checks.
 *
 * @param {unknown} data
 * @returns {GalleryImage[]}
 * @throws {TypeError} If an item is malformed.
 */
export function validateGalleryImages(data) {
  if (!Array.isArray(data)) {
    throw new TypeError("Gallery data must be an array.");
  }

  const ids = new Set();

  data.forEach((image, index) => {
    const itemLabel = `Gallery item ${index + 1}`;
    if (!image || typeof image !== "object" || Array.isArray(image)) {
      throw new TypeError(`${itemLabel}: expected an image object.`);
    }

    const fail = (message) => {
      throw new TypeError(`${itemLabel} (id ${String(image.id)}): ${message}`);
    };

    if (!Number.isInteger(image.id) || image.id <= 0) {
      fail("id must be a positive integer.");
    }
    if (ids.has(image.id)) {
      fail("id must be unique; this id is already used by another image.");
    }
    ids.add(image.id);

    if (!isGalleryPath(image.src)) {
      fail("src must be a local image path under /gallery/ without traversal, query, or fragment.");
    }

    for (const field of ["width", "height"]) {
      if (!Number.isInteger(image[field]) || image[field] <= 0) {
        fail(`${field} must be a positive integer.`);
      }
    }

    for (const field of ["title", "category", "thumbPosition"]) {
      if (typeof image[field] !== "string" || !image[field].trim()) {
        fail(`${field} must be a nonempty string.`);
      }
    }

    if (typeof image.description !== "string") {
      fail("description must be a string; an empty string is allowed.");
    }
    if (typeof image.isWide !== "boolean") {
      fail("isWide must be a boolean.");
    }
    if (image.capture !== undefined && !validateCaptureDetails(image.capture)) {
      fail("capture must contain only valid photographic settings.");
    }
  });

  return /** @type {GalleryImage[]} */ (data);
}
