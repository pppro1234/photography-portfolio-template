import { getCaptureFields } from "../lib/photo-capture.mjs";

export default function LightboxCapture({ capture }) {
  const fields = getCaptureFields(capture);
  if (!fields.length) return null;
  return (
    <dl className="lightbox-capture" aria-label="Camera settings">
      {fields.map(({ key, label, value }) => (
        <div key={key} className={key === "camera" || key === "lens" ? "lightbox-capture-gear" : "lightbox-capture-setting"}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
