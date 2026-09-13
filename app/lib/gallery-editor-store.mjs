import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { applyPhotoOrder } from "./gallery-editor.mjs";
import { validateGalleryImages } from "./gallery-data.mjs";

export class GalleryEditorError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

export function isLocalEditorRequest(headers, environment, mutation = false) {
  if (environment !== "development") return false;
  try {
    const host = headers.get("host");
    const url = new URL(`http://${host}`);
    if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || url.host !== host) return false;
    const site = headers.get("sec-fetch-site");
    if (site && !["same-origin", "none"].includes(site)) return false;
    if (mutation) {
      const origin = new URL(headers.get("origin"));
      if (origin.host !== host || !["http:", "https:"].includes(origin.protocol)) return false;
      if (!headers.get("content-type")?.startsWith("application/json")) return false;
    }
    return true;
  } catch { return false; }
}

export async function readGalleryEditorState(root = process.cwd()) {
  const data = await readFile(path.join(root, "app/gallery-data.json"), "utf8");
  const settings = await readFile(path.join(root, "app/gallery-settings.json"), "utf8");
  return {
    images: validateGalleryImages(JSON.parse(data)),
    sortMode: JSON.parse(settings).sortMode,
    revision: createHash("sha256").update(data).update("\0").update(settings).digest("hex"),
  };
}

export async function saveGalleryEditorOrder({ ids, revision } = {}, root = process.cwd()) {
  const work = path.join(root, ".gallery-editor-work");
  await mkdir(work, { recursive: true });
  const lockFile = path.join(work, "save.lock");
  let lock;
  try { lock = await open(lockFile, "wx"); }
  catch (error) {
    if (error.code === "EEXIST") throw new GalleryEditorError("另一处正在保存，请稍后重试。", 409);
    throw error;
  }
  const dataFile = path.join(root, "app/gallery-data.json");
  const settingsFile = path.join(root, "app/gallery-settings.json");
  const staged = path.join(work, `${randomUUID()}.json`);
  const stagedSettings = `${staged}.settings`;
  try {
    const current = await readGalleryEditorState(root);
    if (revision !== current.revision) throw new GalleryEditorError("图库已在其他地方更新。请重新载入，再调整顺序。", 409);
    let ordered;
    try { ordered = applyPhotoOrder(current.images, ids); }
    catch (error) { throw new GalleryEditorError(error.message); }
    const dataBefore = await readFile(dataFile, "utf8");
    const settingsBefore = await readFile(settingsFile, "utf8");
    const settings = { ...JSON.parse(settingsBefore), sortMode: "original" };
    await writeFile(staged, `${JSON.stringify(ordered, null, 2)}\n`);
    await writeFile(stagedSettings, `${JSON.stringify(settings, null, 2)}\n`);
    if ((await readGalleryEditorState(root)).revision !== revision) throw new GalleryEditorError("图库在保存期间发生变化，请重新载入。", 409);
    await rename(staged, dataFile);
    try {
      if (current.sortMode !== "original") await rename(stagedSettings, settingsFile);
    } catch (error) {
      await writeFile(staged, dataBefore);
      await rename(staged, dataFile);
      throw error;
    }
    return await readGalleryEditorState(root);
  } finally {
    await Promise.all([rm(staged, { force: true }), rm(stagedSettings, { force: true })]);
    await lock.close();
    await rm(lockFile, { force: true });
  }
}
