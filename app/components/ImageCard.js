import Image from "next/image";
import GalleryCardMotion from "./GalleryCardMotion";
import { photoTitleClassName } from "../lib/gallery-presentation";

const getGalleryImageSizes = (img) =>
  img.isWide
    ? "(min-width: 1400px) 660px, (min-width: 1024px) 50vw, 100vw"
    : "(min-width: 1400px) 322px, (min-width: 1024px) 25vw, 50vw";

export default function ImageCard({ img, index }) {
  const caption = (
    <>
      <div className="gallery-shade pointer-events-none absolute inset-0 hidden md:block" />
      <div className="pointer-events-none absolute inset-0 hidden p-3 sm:p-5 md:p-6 md:flex flex-col justify-end">
        <div className="gallery-caption">
          <h3 className={`${photoTitleClassName} text-white mb-1 sm:mb-2`}>
            {img.title}
          </h3>
          <p className="text-gray-300 text-[10px] sm:text-xs font-light tracking-normal uppercase">
            {img.category}
          </p>
        </div>
      </div>
    </>
  );

  return (
    <GalleryCardMotion id={img.id} title={img.title} isWide={img.isWide} index={index} caption={caption}>
      <Image
        src={img.src}
        alt={img.title}
        fill
        sizes={getGalleryImageSizes(img)}
        priority={index === 0}
        className="gallery-photo object-cover"
        style={{ objectPosition: img.thumbPosition || "center" }}
      />
    </GalleryCardMotion>
  );
}
