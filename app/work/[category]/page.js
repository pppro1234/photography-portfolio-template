import { notFound } from "next/navigation";
import WorkPage from "../../components/WorkPage";
import { galleryCategories, getGalleryCategory } from "../../lib/gallery-categories.mjs";
import site from "../../site-config.json";

export const dynamicParams = false;

export function generateStaticParams() {
  return galleryCategories.map(({ slug }) => ({ category: slug }));
}

export async function generateMetadata({ params }) {
  const { category: slug } = await params;
  const category = getGalleryCategory(slug);
  if (!category) notFound();
  return {
    title: `${category.label} — ${site.name}`,
    description: `${category.label} photography by ${site.name}. ${category.description}`,
  };
}

export default async function CategoryPage({ params }) {
  const { category: slug } = await params;
  const category = getGalleryCategory(slug);
  if (!category) notFound();
  return <WorkPage category={category.slug} title={category.label} description={category.description} />;
}
