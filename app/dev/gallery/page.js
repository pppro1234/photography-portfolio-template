import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { isLocalEditorRequest, readGalleryEditorState } from "../../lib/gallery-editor-store.mjs";
import { site } from "../../lib/site-content";
import GalleryEditor from "./GalleryEditor";
import "./editor.css";

export const metadata = { title: `Gallery Editor · ${site.name}`, robots: { index: false, follow: false } };

export default async function GalleryEditorPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  if (!isLocalEditorRequest(await headers(), process.env.NODE_ENV)) notFound();
  return <GalleryEditor siteName={site.name} initialState={await readGalleryEditorState()} />;
}
