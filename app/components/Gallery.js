import images from "../gallery-data.json";
import { validateGalleryImages } from "../lib/gallery-data.mjs";
import GalleryController from "./GalleryController";
import ImageCard from "./ImageCard";
import GalleryFilters from "./GalleryFilters";
import { filterGalleryImages } from "../lib/gallery-categories.mjs";

export default function Gallery({ category = "all" }) {
  const allPhotographs = validateGalleryImages(images);
  const photographs = filterGalleryImages(allPhotographs, category);
  // Only the fields needed to browse the lightbox cross the client boundary.
  const lightboxImages = photographs.map(({ id, src, width, height, title, category, description, isWide }) => ({
    id, src, width, height, title, category, description, isWide,
  }));

  return (
    <GalleryController key={category} images={lightboxImages}>
      {category !== "all" && <GalleryFilters images={allPhotographs} activeCategory={category} />}
      <div className="gallery-grid">
        {photographs.map((img, index) => (
          <ImageCard key={img.id} img={img} index={index} />
        ))}
      </div>
      {photographs.length === 0 && <p className="gallery-empty">New photographs are on their way.</p>}
    </GalleryController>
  );
}
