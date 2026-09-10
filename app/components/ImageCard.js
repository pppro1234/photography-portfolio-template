import GalleryThumbnail from "./GalleryThumbnail";
import GalleryCardMotion from "./GalleryCardMotion";
import { photoTitleClassName } from "../lib/gallery-presentation";

export default function ImageCard({ img, index, eager = false }) {
  const caption = (
    <>
      <div className="gallery-shade pointer-events-none absolute inset-0 hidden md:block" />
      <div className="gallery-card-caption pointer-events-none absolute inset-0 hidden md:flex flex-col justify-end">
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
      <GalleryThumbnail
        id={img.id}
        src={img.src}
        title={img.title}
        isWide={img.isWide}
        thumbPosition={img.thumbPosition}
        eager={eager}
      />
    </GalleryCardMotion>
  );
}
