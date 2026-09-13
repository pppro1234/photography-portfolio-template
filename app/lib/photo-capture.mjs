const fields = new Set(["camera", "lens", "aperture", "exposureTime", "iso"]);

export function validateCaptureDetails(capture) {
  if (!capture || typeof capture !== "object" || Array.isArray(capture) || !Object.keys(capture).length) return false;
  return Object.entries(capture).every(([key, value]) => {
    if (!fields.has(key)) return false;
    if (key === "camera" || key === "lens") return typeof value === "string" && value.trim().length > 0 && value.length <= 320 && !/[\u0000-\u001f\u007f]/.test(value);
    return typeof value === "number" && Number.isFinite(value) && value > 0 && (key !== "iso" || Number.isInteger(value));
  });
}

const number = (value) => Number(value.toPrecision(4)).toString();

export function formatExposureTime(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const reciprocal = 1 / seconds;
  const denominator = Math.round(reciprocal);
  // EXIF rational values arrive as rounded decimals (e.g. 0.06666666667).
  if (seconds < 1 && Math.abs(reciprocal - denominator) / reciprocal < .0001) return `1/${denominator} s`;
  return `${number(seconds)} s`;
}

export function getCaptureFields(capture) {
  if (!validateCaptureDetails(capture)) return [];
  return [
    { key: "camera", label: "Camera", value: capture.camera },
    { key: "lens", label: "Lens", value: capture.lens },
    { key: "aperture", label: "Aperture", value: capture.aperture && `f/${number(capture.aperture)}` },
    { key: "exposureTime", label: "Shutter", value: capture.exposureTime && formatExposureTime(capture.exposureTime) },
    { key: "iso", label: "ISO", value: capture.iso?.toString() },
  ].filter(({ value }) => value);
}
