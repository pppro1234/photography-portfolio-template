import images from "../gallery-data.json";
import settings from "../gallery-settings.json";
import { validateGalleryImages } from "../lib/gallery-data.mjs";
import GalleryController from "./GalleryController";
import ImageCard from "./ImageCard";
import GalleryFilters from "./GalleryFilters";
import { filterGalleryImages } from "../lib/gallery-categories.mjs";
import { getOrderedGalleryImages } from "../lib/gallery-order.mjs";

export default function Gallery({ category = "all" }) {
  const allPhotographs = validateGalleryImages(images);
  // Share one portrait frame across all series; squares do not affect it.
  const portraitFrameRatio = allPhotographs.reduce((ratio, image) =>
    image.width < image.height ? Math.max(ratio, image.width / image.height) : ratio, 3 / 4);
  const photographs = getOrderedGalleryImages(allPhotographs, filterGalleryImages(allPhotographs, category), settings.sortMode);
  // Only the fields needed to browse the lightbox cross the client boundary.
  const lightboxImages = photographs.map(({ id, src, width, height, title, category, description, isWide, capture }) => ({
    id, src, width, height, title, category, description, isWide, capture,
  }));

  return (
    <GalleryController key={category} images={lightboxImages} portraitFrameRatio={portraitFrameRatio}>
      {category !== "all" && <GalleryFilters images={allPhotographs} activeCategory={category} />}
      <div className="gallery-grid">
        {photographs.map((img, index) => <ImageCard key={img.id} img={img} index={index} eager={index === 0} />)}
      </div>
      {photographs.length === 0 && <p className="gallery-empty">New photographs are on their way.</p>}
    </GalleryController>
  );
}
