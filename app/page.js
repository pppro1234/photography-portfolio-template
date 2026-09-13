import WorkPage from "./components/WorkPage";

export default async function Home({ searchParams }) {
  if (process.env.NODE_ENV === "development" && (await searchParams)?.galleryEditor === "1") {
    const { headers } = await import("next/headers");
    const { isLocalEditorRequest, readGalleryEditorState } = await import("./lib/gallery-editor-store.mjs");
    if (isLocalEditorRequest(await headers(), process.env.NODE_ENV)) {
      const { default: GalleryEditorPreview } = await import("./dev/gallery/GalleryEditorPreview");
      const { images } = await readGalleryEditorState();
      return <WorkPage galleryOverride={<GalleryEditorPreview initialImages={images} />} />;
    }
  }
  return <WorkPage />;
}
