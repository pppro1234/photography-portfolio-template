// Blank settings inherit the existing site identity and the current gallery.
export function resolveAboutContent(config, site, images) {
  const image = images.find(({ src }) => src === config.imageSrc) || images[0] || null;
  return {
    ...config,
    name: site.name,
    statement: config.statement || site.tagline,
    image,
    imageAlt: config.imageAlt || image?.title || "",
    imageCaption: config.imageCaption || (image ? `${image.title} / ${image.category}` : ""),
  };
}
