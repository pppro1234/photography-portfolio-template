import { sortGalleryImages } from "./gallery-order.mjs";

export const samePhotoOrder = (first, second) => first.length === second.length && first.every((id, index) => id === second[index]);
export const savedPhotoIds = (server) => sortGalleryImages(server.images, server.sortMode).map(({ id }) => id);

export function createEditorState(server) {
  return { server, history: { past: [], ids: savedPhotoIds(server), future: [] }, conflict: false };
}

// Refresh the photo collection without silently discarding a local arrangement.
// Deleted IDs leave every undo/redo snapshot; new photographs join the end of
// a draft. Concurrent changes to the surviving order require an explicit choice.
export function reconcileEditorState(editor, incoming) {
  if (editor.server.revision === incoming.revision) return editor;
  const before = savedPhotoIds(editor.server);
  const after = savedPhotoIds(incoming);
  if (samePhotoOrder(editor.history.ids, before)) return createEditorState(incoming);

  const valid = new Set(after);
  const rebase = (ids) => {
    const retained = ids.filter((id) => valid.has(id));
    const present = new Set(retained);
    return [...retained, ...after.filter((id) => !present.has(id))];
  };
  const ids = rebase(editor.history.ids);
  const common = new Set(before.filter((id) => valid.has(id)));
  const reordered = !samePhotoOrder(before.filter((id) => common.has(id)), after.filter((id) => common.has(id)));
  return {
    server: incoming,
    history: { past: editor.history.past.map(rebase), ids, future: editor.history.future.map(rebase) },
    conflict: !samePhotoOrder(ids, after) && (editor.conflict || reordered),
  };
}

export function applyPhotoOrder(images, ids) {
  if (!Array.isArray(ids) || ids.length !== images.length || new Set(ids).size !== ids.length) {
    throw new TypeError("顺序必须包含每张照片，且不能重复。");
  }
  const byId = new Map(images.map((image) => [image.id, image]));
  if (ids.some((id) => !Number.isInteger(id) || !byId.has(id))) throw new TypeError("顺序中包含未知照片。");
  return ids.map((id) => byId.get(id));
}

export function movePhoto(ids, activeId, targetId, placement = "before") {
  if (activeId === targetId || !ids.includes(activeId) || !ids.includes(targetId)) return ids;
  const next = ids.filter((id) => id !== activeId);
  next.splice(next.indexOf(targetId) + (placement === "after" ? 1 : 0), 0, activeId);
  return next.every((id, index) => id === ids[index]) ? ids : next;
}

export function movePhotoByStep(ids, id, step) {
  const index = ids.indexOf(id);
  const target = ids[index + step];
  return target === undefined ? ids : movePhoto(ids, id, target, step < 0 ? "before" : "after");
}

export function photoDropTarget(rectangles, x, y, activeId) {
  let closest = null;
  let distance = Infinity;
  for (const rect of rectangles) {
    if (rect.id === activeId) continue;
    const dx = Math.max(rect.left - x, 0, x - rect.right);
    const dy = Math.max(rect.top - y, 0, y - rect.bottom);
    const score = dx * dx + dy * dy;
    if (score < distance) { distance = score; closest = rect; }
  }
  if (!closest) return null;
  const after = y > closest.bottom || (y >= closest.top && x >= (closest.left + closest.right) / 2);
  return { id: closest.id, placement: after ? "after" : "before" };
}
