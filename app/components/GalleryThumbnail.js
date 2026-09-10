"use client";

import Image from "next/image";
import { useGalleryMotion } from "./GalleryController";
import { getGalleryImageSizes } from "../lib/gallery-image-sizes.mjs";

export default function GalleryThumbnail({ id, src, title, isWide, thumbPosition, eager }) {
  const { columnSpansById } = useGalleryMotion();
  const span = columnSpansById.get(id) ?? (isWide ? 2 : 1);
  return (
    <Image
      src={src}
      alt={title}
      fill
      sizes={getGalleryImageSizes(span === 2, !eager)}
      loading={eager ? "eager" : "lazy"}
      className="gallery-photo object-cover"
      style={{ objectPosition: thumbPosition || "center" }}
    />
  );
}
