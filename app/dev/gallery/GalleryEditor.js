"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpRight, Check, ChevronLeft, ChevronRight, GripVertical, ImageIcon, Monitor, Redo2, RotateCcw, RotateCw, Save, Smartphone, Tablet, Undo2, X } from "lucide-react";
import { applyPhotoOrder, createEditorState, movePhoto, movePhotoByStep, reconcileEditorState, samePhotoOrder as same, savedPhotoIds } from "../../lib/gallery-editor.mjs";
import { validateGalleryImages } from "../../lib/gallery-data.mjs";

const devices = [
  { id: "desktop", label: "电脑", icon: Monitor, width: 1440, height: 900 },
  { id: "ipad", label: "iPad", icon: Tablet, width: 820, height: 1180 },
  { id: "iphone", label: "iPhone", icon: Smartphone, width: 390, height: 844 },
];
export default function GalleryEditor({ initialState, siteName }) {
  const [editor, setEditor] = useState(() => createEditorState(initialState));
  const { server, history, conflict } = editor;
  const setHistory = useCallback((update) => setEditor((previous) => ({ ...previous, history: typeof update === "function" ? update(previous.history) : update })), []);
  const [selectedId, setSelectedId] = useState(null);
  const [deviceId, setDeviceId] = useState("desktop");
  const [dimensions, setDimensions] = useState({ width: 1440, height: 900 });
  const [zoom, setZoom] = useState("fit");
  const [available, setAvailable] = useState({ width: 1000, height: 800 });
  const [mode, setMode] = useState("edit");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [sidebar, setSidebar] = useState(false);
  const [frameKey, setFrameKey] = useState(0);
  const [ready, setReady] = useState(false);
  const [sync, setSync] = useState("checking");
  const iframe = useRef(null);
  const stage = useRef(null);
  const current = useRef(null);
  const listDrag = useRef(null);
  const checkRequest = useRef({ controller: null, epoch: 0 });
  const savedIds = useMemo(() => savedPhotoIds(server), [server]);
  const dirty = !same(history.ids, savedIds);
  const images = useMemo(() => applyPhotoOrder(server.images, history.ids), [server.images, history.ids]);
  const selectedIndex = history.ids.indexOf(selectedId);
  const selected = images[selectedIndex];
  const scale = zoom === "fit" ? Math.min(1, Math.max(.1, (available.width - 64) / dimensions.width), Math.max(.1, (available.height - 64) / dimensions.height)) : Number(zoom);
  current.current = { ...editor, images: server.images, mode, saving, selectedId };

  const refreshGallery = useCallback(async () => {
    if (current.current.saving || checkRequest.current.controller) return;
    const controller = new AbortController();
    const epoch = ++checkRequest.current.epoch;
    checkRequest.current.controller = controller;
    const revision = current.current.server.revision;
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch("/api/dev/gallery", { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error("Unable to read gallery");
      const incoming = await response.json();
      validateGalleryImages(incoming.images);
      if (typeof incoming.revision !== "string" || !["original", "color", "brightness"].includes(incoming.sortMode)) throw new Error("Invalid gallery state");
      // A save or newer refresh supersedes this in-flight response.
      if (checkRequest.current.epoch !== epoch || current.current.saving || current.current.server.revision !== revision) return;
      const before = current.current;
      const next = reconcileEditorState(before, incoming);
      if (next !== before) {
        current.current = { ...before, ...next, images: next.server.images };
        setEditor(next);
        setStatus(same(next.history.ids, savedPhotoIds(incoming)) ? "已载入最新本地图库" : "本地图库已更新，未保存的排列已保留。");
        setSelectedId((id) => incoming.images.some((image) => image.id === id) ? id : null);
      }
      setSync("ready");
    } catch {
      if (checkRequest.current.epoch === epoch) setSync("offline");
    } finally {
      clearTimeout(timeout);
      if (checkRequest.current.epoch === epoch) checkRequest.current.controller = null;
    }
  }, []);

  useEffect(() => {
    const refreshVisible = () => { if (document.visibilityState === "visible") refreshGallery(); };
    refreshGallery();
    const timer = setInterval(refreshVisible, 3000);
    window.addEventListener("focus", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refreshVisible);
      document.removeEventListener("visibilitychange", refreshVisible);
      checkRequest.current.epoch++;
      checkRequest.current.controller?.abort();
      checkRequest.current.controller = null;
    };
  }, [refreshGallery]);
  useEffect(() => { refreshGallery(); }, [initialState.revision, refreshGallery]);

  const post = useCallback((type, payload = {}) => iframe.current?.contentWindow?.postMessage({ type: `portfolio:editor:${type}`, ...payload }, window.location.origin), []);
  const sendState = useCallback(() => {
    const state = current.current;
    post("state", { images: state.images, ids: state.history.ids, enabled: state.mode === "edit" && !state.saving, selectedId: state.selectedId });
  }, [post]);
  const change = useCallback((ids) => {
    setHistory((previous) => same(previous.ids, ids) ? previous : { past: [...previous.past.slice(-99), previous.ids], ids, future: [] });
    setStatus("");
    setError("");
  }, [setHistory]);
  const undo = useCallback(() => { setStatus(""); setHistory((previous) => previous.past.length ? {
    past: previous.past.slice(0, -1), ids: previous.past.at(-1), future: [previous.ids, ...previous.future],
  } : previous); }, [setHistory]);
  const redo = useCallback(() => { setStatus(""); setHistory((previous) => previous.future.length ? {
    past: [...previous.past, previous.ids], ids: previous.future[0], future: previous.future.slice(1),
  } : previous); }, [setHistory]);

  useLayoutEffect(() => {
    const element = stage.current;
    const measure = () => setAvailable({ width: element.clientWidth, height: element.clientHeight });
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const receive = (event) => {
      if (event.source !== iframe.current?.contentWindow || event.origin !== window.location.origin) return;
      const data = event.data;
      if (data?.type === "portfolio:editor:ready") { setReady(true); sendState(); }
      if (data?.type === "portfolio:editor:browse") setMode("browse");
      if (data?.type === "portfolio:editor:select" && current.current.images.some(({ id }) => id === data.id)) setSelectedId(data.id);
      if (data?.type === "portfolio:editor:order" && !current.current.saving) {
        try { applyPhotoOrder(current.current.images, data.ids); change(data.ids); }
        catch { setError("无法应用这次移动，请重试。"); }
      }
      if (data?.type === "portfolio:editor:reload-needed") refreshGallery();
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [change, sendState, refreshGallery]);
  useEffect(() => { sendState(); }, [server.revision, history.ids, selectedId, mode, saving, ready, sendState]);
  useEffect(() => {
    if (!dirty) return;
    const prevent = (event) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);

  const save = async () => {
    if (conflict || saving || !dirty) return;
    checkRequest.current.epoch++;
    checkRequest.current.controller?.abort();
    checkRequest.current.controller = null;
    current.current.saving = true;
    setSaving(true); setError(""); setStatus("");
    const submitted = [...history.ids];
    try {
      const response = await fetch("/api/dev/gallery", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: submitted, revision: server.revision }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "保存失败，请重试。");
      setEditor((previous) => ({ ...previous, server: result, conflict: false }));
      setSync("ready");
      setStatus("已保存到本地，线上网站需另行发布。");
    } catch (failure) { setError(failure.message); }
    finally { setSaving(false); }
  };
  const selectDevice = (device) => {
    setDeviceId(device.id); setDimensions({ width: device.width, height: device.height });
  };
  const changeDimension = (key, value) => {
    const number = Number(value);
    if (Number.isInteger(number) && number >= 280 && number <= 3000) setDimensions((previous) => ({ ...previous, [key]: number }));
  };
  const select = (id) => { setSelectedId(id); post("focus", { id }); };
  const resolveConflict = (keepDraft) => {
    if (!keepDraft) change(savedIds);
    setEditor((previous) => ({ ...previous, conflict: false }));
    setStatus(keepDraft ? "已保留当前排列，点击保存后才会写入本地。" : "已载入本地排列");
    setError("");
  };

  return (
    <main className="gallery-editor" lang="zh-CN" aria-label="图库排列工作台">
      <header className="editor-header">
        <div className="editor-brand"><span className="editor-wordmark">{siteName}</span><span className="editor-divider" /><div><h1>排列工作台</h1><p><span className="editor-dot" />本地开发</p></div></div>
        <div className="editor-header-actions">
          <span className={`editor-save-state ${dirty || conflict || sync === "offline" ? "is-dirty" : ""}`} role="status">{saving ? "正在保存到本地…" : sync === "offline" ? "无法核对本地状态" : conflict ? "本地顺序有冲突" : sync === "checking" ? "正在核对本地图库…" : dirty ? "有未保存的排列" : "本地已保存"}</span>
          <a className="editor-button editor-open-site" href="/" target="_blank" rel="noopener noreferrer">本地预览<ArrowUpRight size={14} /></a>
          <button className="editor-button editor-primary" disabled={!dirty || saving || conflict || sync !== "ready"} onClick={save}><Save size={15} />{saving ? "保存中…" : "保存到本地"}</button>
        </div>
      </header>

      <div className="editor-toolbar">
        <div className="editor-device-picker" role="group" aria-label="预览设备">
          {devices.map((device) => <button key={device.id} className="editor-device" aria-pressed={deviceId === device.id} onClick={() => selectDevice(device)}><device.icon size={17} /><span>{device.label}</span></button>)}
        </div>
        <div className="editor-dimensions">
          <input key={`width-${deviceId}-${dimensions.width}`} type="number" aria-label="预览宽度" defaultValue={dimensions.width} min={280} max={3000} onBlur={(event) => changeDimension("width", event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} />
          <span>×</span>
          <input key={`height-${deviceId}-${dimensions.height}`} type="number" aria-label="预览高度" defaultValue={dimensions.height} min={280} max={3000} onBlur={(event) => changeDimension("height", event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} />
          <button className="editor-icon-button" aria-label="切换横竖屏" title="切换横竖屏" onClick={() => setDimensions(({ width, height }) => ({ width: height, height: width }))}><RotateCw size={16} /></button>
        </div>
        <div className="editor-toolbar-end">
          <select className="editor-zoom" aria-label="预览缩放" value={zoom} onChange={(event) => setZoom(event.target.value)}><option value="fit">适应窗口 · {Math.round(scale * 100)}%</option><option value="1">100%</option><option value="0.75">75%</option><option value="0.5">50%</option></select>
          <div className="editor-mode" role="group" aria-label="工作模式">
            <button aria-pressed={mode === "edit"} onClick={() => { if (mode !== "edit") { setMode("edit"); setReady(false); setFrameKey((key) => key + 1); } }}>排列</button>
            <button aria-pressed={mode === "browse"} onClick={() => setMode("browse")}>浏览</button>
          </div>
          <button className="editor-icon-button editor-sidebar-toggle" aria-label="显示作品列表" aria-expanded={sidebar} onClick={() => setSidebar(!sidebar)}><ImageIcon size={18} /></button>
        </div>
      </div>

      {conflict ? <div className="editor-notice editor-error" role="alert">本地也修改了排列，请选择要保留的顺序。<button onClick={() => resolveConflict(true)}>保留当前排列</button><button onClick={() => resolveConflict(false)}>载入本地排列</button></div>
        : sync === "offline" ? <div className="editor-notice editor-error" role="alert">暂时无法读取本地图库，当前草稿仍保留。<button onClick={refreshGallery}>重试</button></div>
        : (error || status) && <div className={`editor-notice ${error ? "editor-error" : ""}`} role={error ? "alert" : "status"}>
          {error || <><Check size={14} />{status}</>}{error.includes("重新载入") && <button onClick={refreshGallery}>读取本地更新</button>}
        </div>}

      <div className="editor-workspace">
        <section className="editor-canvas" aria-label="设备预览画布">
          <div className="editor-canvas-bar"><span><span className="editor-dot" />{mode === "edit" ? "拖动照片，编排你的作品" : "浏览网站，查看实际交互"}</span><span>{images.length} 张作品 · 共用一份顺序</span></div>
          <div className="editor-stage" ref={stage}>
            <div className={`editor-device-frame editor-frame-${deviceId}`} style={{ width: dimensions.width * scale, height: dimensions.height * scale }}>
              {!ready && <div className="editor-loading">正在载入网站…</div>}
              <iframe key={frameKey} ref={iframe} title="网站设备预览" src="/?galleryEditor=1" onLoad={sendState} style={{ width: dimensions.width, height: dimensions.height, transform: `scale(${scale})` }} />
            </div>
          </div>
          <div className="editor-canvas-footer"><span>{dimensions.width} × {dimensions.height} · {Math.round(scale * 100)}%</span><span>设备尺寸预览 · 可在画面内滚动</span></div>
        </section>

        <aside className={`editor-sidebar ${sidebar ? "is-open" : ""}`} aria-label="作品顺序">
          <div className="editor-sidebar-heading"><h2>作品顺序 <span>{images.length}</span></h2><button className="editor-icon-button editor-sidebar-toggle" aria-label="关闭作品列表" onClick={() => setSidebar(false)}><X size={16} /></button></div>
          <p className="editor-sidebar-hint">点击定位，也可以拖动列表排序。</p>
          <ol className="editor-photo-list">
            {images.map((image, index) => <li key={image.id} draggable={!saving} onDragStart={(event) => { listDrag.current = image.id; event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", String(image.id)); }} onDragEnd={() => { listDrag.current = null; }} onDragOver={(event) => { if (listDrag.current && !saving) event.preventDefault(); }} onDrop={(event) => {
              event.preventDefault();
              if (!saving && listDrag.current) {
                const bounds = event.currentTarget.getBoundingClientRect();
                change(movePhoto(history.ids, listDrag.current, image.id, event.clientY > (bounds.top + bounds.bottom) / 2 ? "after" : "before"));
                setSelectedId(listDrag.current); listDrag.current = null;
              }
            }}>
              <button className="editor-photo-row" aria-pressed={selectedId === image.id} aria-label={`选择第 ${index + 1} 张：${image.title}`} onClick={() => select(image.id)}>
                <span className="editor-row-number">{String(index + 1).padStart(2, "0")}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.src} alt="" loading="lazy" draggable={false} />
                <span className="editor-row-copy"><span>{image.title}</span><small>{image.category}</small></span><GripVertical size={13} className="editor-row-grip" />
              </button>
            </li>)}
          </ol>
          <div className="editor-selection"><p>{selected ? selected.title : "选择一张照片"}</p><span>{selected ? `第 ${selectedIndex + 1} / ${images.length} 张` : "在画布或列表中点击照片"}</span>
            <div><button className="editor-button" disabled={!selected || selectedIndex === 0 || saving} onClick={() => change(movePhotoByStep(history.ids, selectedId, -1))}><ArrowUp size={14} />前移</button><button className="editor-button" disabled={!selected || selectedIndex === images.length - 1 || saving} onClick={() => change(movePhotoByStep(history.ids, selectedId, 1))}><ArrowDown size={14} />后移</button></div>
          </div>
        </aside>
      </div>

      <footer className="editor-bottom-bar">
        <div className="editor-history"><button className="editor-icon-button" aria-label="撤销移动" title="撤销移动" disabled={!history.past.length || saving} onClick={undo}><Undo2 size={17} /></button><button className="editor-icon-button" aria-label="重做移动" title="重做移动" disabled={!history.future.length || saving} onClick={redo}><Redo2 size={17} /></button><span className="editor-divider" /><button className="editor-text-button" disabled={!dirty || saving} onClick={() => change(savedIds)}><RotateCcw size={14} />恢复已保存顺序</button></div>
        <p>保存仅更新本地预览，线上网站需另行发布。</p>
        <div className="editor-keyboard-hint"><ChevronLeft size={13} /><ChevronRight size={13} /><span>Alt + 方向键微调</span></div>
      </footer>
    </main>
  );
}
