import configuredCategories from "../gallery-categories.mjs";

const fallback = { slug: "photography", label: "Photography", description: "More photographs and personal perspectives." };
export const galleryCategories = [...configuredCategories, fallback];
const configuredLabels = new Set(configuredCategories.map(({ label }) => label));
const slugs = new Set(["all", fallback.slug]);
const labels = new Set([fallback.label]);
for (const category of configuredCategories) {
  if (!category || typeof category.slug !== "string" || !/^[a-z]+(?:-[a-z]+)*$/.test(category.slug) || slugs.has(category.slug)
    || typeof category.label !== "string" || !category.label.trim() || labels.has(category.label)
    || typeof category.description !== "string" || !category.description.trim()) {
    throw new TypeError("Gallery categories require a unique slug, label and description; all/photography are reserved.");
  }
  slugs.add(category.slug);
  labels.add(category.label);
}

export function getGalleryCategory(slug) {
  return galleryCategories.find((category) => category.slug === slug);
}

export function filterGalleryImages(images, slug = "all") {
  if (slug === "all") return images;
  const category = getGalleryCategory(slug);
  // Keep legacy Photography/custom labels visible without rewriting anyone's data.
  if (slug === fallback.slug) return images.filter((image) => !configuredLabels.has(image.category));
  return category ? images.filter((image) => image.category === category.label) : [];
}

export function getCategoryHref(slug) {
  return slug === "all" ? "/" : `/work/${slug}`;
}
