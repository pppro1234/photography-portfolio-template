import { GalleryEditorError, isLocalEditorRequest, readGalleryEditorState, saveGalleryEditorOrder } from "../../../lib/gallery-editor-store.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const reply = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request) {
  if (!isLocalEditorRequest(request.headers, process.env.NODE_ENV)) return reply({ error: "Not found" }, 404);
  return reply(await readGalleryEditorState());
}

export async function PUT(request) {
  if (!isLocalEditorRequest(request.headers, process.env.NODE_ENV, true)) return reply({ error: "Not found" }, 404);
  try {
    const text = await request.text();
    if (text.length > 65536) return reply({ error: "提交的顺序过长。" }, 413);
    let body;
    try { body = JSON.parse(text); } catch { return reply({ error: "无法读取提交的顺序。" }, 400); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return reply({ error: "无效的保存请求。" }, 400);
    return reply(await saveGalleryEditorOrder(body));
  } catch (error) {
    if (error instanceof GalleryEditorError) return reply({ error: error.message }, error.status);
    return reply({ error: "保存失败，请重试。当前草稿仍保留在页面中。" }, 500);
  }
}
