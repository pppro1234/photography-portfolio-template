import Link from "next/link";
import { filterGalleryImages, galleryCategories, getCategoryHref } from "../lib/gallery-categories.mjs";

export default function GalleryFilters({ images, activeCategory }) {
  const categories = [{ slug: "all", label: "All work" }, ...galleryCategories];
  const count = filterGalleryImages(images, activeCategory).length;

  return (
    <div className="gallery-toolbar">
      <nav aria-label="Filter photographs" className="gallery-filters">
        {categories.map(({ slug, label }) => (
          <Link key={slug} href={getCategoryHref(slug)} scroll={false}
            className="gallery-filter" aria-current={slug === activeCategory ? "page" : undefined}>
            <span>{label}</span><span className="gallery-filter-count">{filterGalleryImages(images, slug).length}</span>
          </Link>
        ))}
      </nav>
      <p className="gallery-result-count">{count} {count === 1 ? "photograph" : "photographs"}</p>
    </div>
  );
}
