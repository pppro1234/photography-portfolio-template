import sharp from "sharp";

const linear = (value) => {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
};

// Perceptual lightness and opponent colors avoid unstable hue values in
// nearly grey photographs. Transparent pixels contribute proportionally.
export function measureAppearance(pixels) {
  let weight = 0, lightness = 0, squareLightness = 0, a = 0, b = 0, chroma = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3] / 255;
    if (!alpha) continue;
    const r = linear(pixels[index]), g = linear(pixels[index + 1]), blue = linear(pixels[index + 2]);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * blue);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * blue);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * blue);
    const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
    const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    weight += alpha;
    lightness += L * alpha;
    squareLightness += L * L * alpha;
    a += A * alpha;
    b += B * alpha;
    chroma += Math.hypot(A, B) * alpha;
  }
  if (!weight) return { version: 1, lightness: 0.5, a: 0, b: 0, contrast: 0, chroma: 0 };
  const mean = lightness / weight;
  const round = (value) => Number(value.toFixed(5));
  return {
    version: 1,
    lightness: round(Math.max(0, Math.min(1, mean))),
    a: round(a / weight), b: round(b / weight),
    contrast: round(Math.sqrt(Math.max(0, squareLightness / weight - mean * mean))),
    chroma: round(chroma / weight),
  };
}

export async function readPhotograph(source) {
  const image = sharp(source);
  const { autoOrient: { width, height } } = await image.metadata();
  const pixels = await image.rotate().toColourspace("srgb")
    .resize({ width: 64, height: 64, fit: "inside" }).ensureAlpha().raw().toBuffer();
  return { width, height, appearance: measureAppearance(pixels) };
}
