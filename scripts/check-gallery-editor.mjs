import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { applyPhotoOrder, createEditorState, movePhoto, movePhotoByStep, photoDropTarget, reconcileEditorState, savedPhotoIds } from "../app/lib/gallery-editor.mjs";
import { isLocalEditorRequest, readGalleryEditorState, saveGalleryEditorOrder } from "../app/lib/gallery-editor-store.mjs";

test("moves insert before and after without losing IDs; edge moves and cancelled drops are no-ops", () => {
  const ids = [1, 2, 3, 4];
  assert.deepEqual(movePhoto(ids, 1, 3, "after"), [2, 3, 1, 4]);
  assert.deepEqual(movePhoto(ids, 4, 2), [1, 4, 2, 3]);
  assert.equal(movePhoto(ids, 3, 3), ids);
  assert.equal(movePhoto(ids, 1, 2), ids);
  assert.equal(movePhotoByStep(ids, 1, -1), ids);
  assert.equal(movePhotoByStep(ids, 4, 1), ids);
  assert.deepEqual(movePhotoByStep(ids, 2, 1), [1, 3, 2, 4]);
  assert.deepEqual(ids, [1, 2, 3, 4]);
});

test("mixed-width drop targets use the side of a photo and the nearest row across gaps", () => {
  const rects = [{ id: 1, left: 0, right: 200, top: 0, bottom: 100 }, { id: 2, left: 210, right: 300, top: 0, bottom: 100 }, { id: 3, left: 0, right: 90, top: 110, bottom: 210 }];
  assert.deepEqual(photoDropTarget(rects, 220, 50, 1), { id: 2, placement: "before" });
  assert.deepEqual(photoDropTarget(rects, 290, 50, 1), { id: 2, placement: "after" });
  assert.deepEqual(photoDropTarget(rects, 50, 250, 1), { id: 3, placement: "after" });
  assert.equal(photoDropTarget(rects.slice(0, 1), 20, 20, 1), null);
});

test("saving requires an exact ID permutation and preserves every metadata field", () => {
  const images = [{ id: 1, title: "First", appearance: { version: 1 } }, { id: 2, title: "Second" }];
  assert.equal(applyPhotoOrder(images, [2, 1])[0], images[1]);
  for (const ids of [null, [], [1], [1, 1], [1, 3], ["1", 2], [1, 2, 3]]) assert.throws(() => applyPhotoOrder(images, ids));
});

const state = (ids, revision) => ({ images: ids.map((id) => ({ id, title: `Photo ${id}` })), sortMode: "original", revision });

test("an unchanged editor adopts real gallery additions, removals, metadata and ordering", () => {
  const editor = createEditorState(state([1, 2, 3], "before"));
  const incoming = state([3, 1, 4], "after");
  incoming.images[0].title = "Updated caption";
  const next = reconcileEditorState(editor, incoming);
  assert.deepEqual(next.history, { past: [], ids: [3, 1, 4], future: [] });
  assert.equal(next.server, incoming);
  assert.equal(next.conflict, false);
  assert.equal(reconcileEditorState(next, incoming), next);
});

test("removing a photo preserves an unsaved arrangement and cleans every undo and redo snapshot", () => {
  const editor = createEditorState(state([1, 4, 8, 23, 3, 9, 10, 22], "before"));
  editor.history = { past: [[1, 4, 8, 23, 3, 9, 10, 22]], ids: [1, 4, 8, 22, 3, 9, 10, 23], future: [[22, 1, 4, 8, 23, 3, 9, 10]] };
  const next = reconcileEditorState(editor, state([1, 4, 8, 3, 9, 10, 22, 24], "after"));
  assert.deepEqual(next.history.ids, [1, 4, 8, 22, 3, 9, 10, 24]);
  assert.equal(next.conflict, false);
  for (const ids of [...next.history.past, next.history.ids, ...next.history.future]) {
    assert.ok(!ids.includes(23));
    assert.equal(ids.at(-1), 24);
    assert.equal(applyPhotoOrder(next.server.images, ids).length, 8);
  }
  assert.ok(editor.history.ids.includes(23), "the earlier state is not mutated");
});

test("concurrent rearrangements need a choice, while metadata changes preserve a draft without conflict", () => {
  const editor = createEditorState(state([1, 2, 3], "before"));
  editor.history.ids = [2, 1, 3];
  const refreshed = reconcileEditorState(editor, state([1, 2, 3], "metadata"));
  assert.deepEqual(refreshed.history.ids, [2, 1, 3]);
  assert.equal(refreshed.conflict, false);
  const conflict = reconcileEditorState(editor, state([1, 3, 2], "reordered"));
  assert.equal(conflict.conflict, true);
  assert.deepEqual(conflict.history.ids, [2, 1, 3]);
  assert.equal(reconcileEditorState(conflict, state([1, 3, 2], "more-metadata")).conflict, true);
  assert.equal(reconcileEditorState(editor, state([2, 1, 3], "same-draft")).conflict, false);
});

test("initial editor order follows the local site's configured brightness sorting", () => {
  const server = state([1, 2], "sorted");
  server.sortMode = "brightness";
  server.images.forEach((image) => { image.appearance = { version: 1, lightness: image.id / 3, a: 0, b: 0, contrast: .2, chroma: .1 }; });
  assert.deepEqual(savedPhotoIds(server), [2, 1]);
  assert.deepEqual(createEditorState(server).history.ids, [2, 1]);
});

test("only local development and same-origin JSON requests can save", () => {
  const local = new Headers({ host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000", "content-type": "application/json", "sec-fetch-site": "same-origin" });
  assert.equal(isLocalEditorRequest(local, "development", true), true);
  assert.equal(isLocalEditorRequest(local, "production", true), false);
  for (const [key, value] of [["origin", "https://attacker.example"], ["host", "portfolio.example"], ["host", "localhost.attacker.example"], ["content-type", "text/plain"], ["sec-fetch-site", "cross-site"]]) {
    const headers = new Headers(local); headers.set(key, value);
    assert.equal(isLocalEditorRequest(headers, "development", true), false);
  }
  const noOrigin = new Headers(local); noOrigin.delete("origin");
  assert.equal(isLocalEditorRequest(noOrigin, "development", true), false);
});

test("the store persists only order, activates manual sorting, and rejects stale or invalid writes", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "gallery-editor-test-"));
  const images = [1, 2, 3].map((id) => ({ id, src: `/gallery/${id}.jpg`, width: 100, height: 200, isWide: false, thumbPosition: "center", title: `Photo ${id}`, category: "Landscape", description: "Test", custom: { untouched: true } }));
  try {
    await mkdir(path.join(root, "app"));
    await writeFile(path.join(root, "app/gallery-data.json"), JSON.stringify(images));
    await writeFile(path.join(root, "app/gallery-settings.json"), JSON.stringify({ sortMode: "color", extra: "preserved" }));
    const first = await readGalleryEditorState(root);
    const result = await saveGalleryEditorOrder({ ids: [3, 1, 2], revision: first.revision }, root);
    assert.deepEqual(result.images, [images[2], images[0], images[1]]);
    assert.equal(result.sortMode, "original");
    assert.equal(JSON.parse(await readFile(path.join(root, "app/gallery-settings.json"), "utf8")).extra, "preserved");
    assert.notEqual(first.revision, result.revision);
    await assert.rejects(saveGalleryEditorOrder({ ids: [1, 2, 3], revision: first.revision }, root), (error) => error.status === 409);
    await assert.rejects(saveGalleryEditorOrder({ ids: [3, 3, 2], revision: result.revision }, root), (error) => error.status === 400);
    assert.deepEqual(await readGalleryEditorState(root), result);
  } finally { await rm(root, { recursive: true, force: true }); }
});
