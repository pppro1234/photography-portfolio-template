"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GalleryController from "../../components/GalleryController";
import ImageCard from "../../components/ImageCard";
import { applyPhotoOrder, movePhoto, movePhotoByStep, photoDropTarget } from "../../lib/gallery-editor.mjs";
import { validateGalleryImages } from "../../lib/gallery-data.mjs";
import "./preview.css";

const send = (type, payload = {}) => window.parent.postMessage({ type: `portfolio:editor:${type}`, ...payload }, window.location.origin);

export default function GalleryEditorPreview({ initialImages }) {
  const [images, setImages] = useState(initialImages);
  const [enabled, setEnabled] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [drag, setDrag] = useState(null);
  const [target, setTarget] = useState(null);
  const gesture = useRef(null);
  const frame = useRef(null);
  const imageRef = useRef(images);
  imageRef.current = images;

  const cancel = useCallback(() => {
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = null;
    gesture.current = null;
    setDrag(null);
    setTarget(null);
  }, []);

  useEffect(() => {
    const receive = (event) => {
      if (event.source !== window.parent || event.origin !== window.location.origin) return;
      const message = event.data;
      if (message?.type === "portfolio:editor:state") {
        try {
          const updated = applyPhotoOrder(validateGalleryImages(message.images ?? initialImages), message.ids);
          if (gesture.current && !updated.some(({ id }) => id === gesture.current.id)) cancel();
          setImages(updated);
          setEnabled(Boolean(message.enabled));
          setSelectedId(message.selectedId);
          if (!message.enabled) cancel();
        } catch { send("reload-needed"); }
      }
      if (message?.type === "portfolio:editor:focus" && Number.isInteger(message.id)) {
        const card = document.querySelector(`[data-photo-id="${message.id}"]`);
        card?.scrollIntoView({ block: "center", behavior: "instant" });
      }
    };
    const escape = (event) => { if (event.key === "Escape") cancel(); };
    window.addEventListener("message", receive);
    window.addEventListener("keydown", escape);
    window.addEventListener("blur", cancel);
    send("ready");
    return () => {
      window.removeEventListener("message", receive);
      window.removeEventListener("keydown", escape);
      window.removeEventListener("blur", cancel);
      cancel();
    };
  }, [initialImages, cancel]);

  useEffect(() => {
    if (!enabled) return;
    const navigate = (event) => {
      const link = event.target.closest?.("a[href]");
      if (!link || link.target === "_blank" || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const url = new URL(link.href, window.location.href);
      if (url.pathname !== window.location.pathname || url.search !== window.location.search) send("browse");
    };
    document.addEventListener("click", navigate, true);
    return () => document.removeEventListener("click", navigate, true);
  }, [enabled]);

  const select = useCallback((id) => { setSelectedId(id); send("select", { id }); }, []);
  const commit = useCallback((ids) => {
    setImages((current) => applyPhotoOrder(current, ids));
    send("order", { ids });
  }, []);
  const updateTarget = useCallback(() => {
    const current = gesture.current;
    if (!current?.active) return;
    const rectangles = Array.from(document.querySelectorAll("[data-editor-photo-id]")).map((element) => {
      const { left, top, right, bottom } = element.getBoundingClientRect();
      return { id: Number(element.dataset.editorPhotoId), left, top, right, bottom };
    });
    current.target = photoDropTarget(rectangles, current.x, current.y, current.id);
    setTarget(current.target);
    setDrag({ id: current.id, x: current.x, y: current.y, src: current.src });
  }, []);
  const autoScroll = useCallback(function tick() {
    const current = gesture.current;
    if (!current?.active) return;
    const edge = 70;
    const amount = current.y < edge ? -16 * (1 - current.y / edge)
      : current.y > window.innerHeight - edge ? 16 * (1 - (window.innerHeight - current.y) / edge) : 0;
    if (amount) { window.scrollBy(0, amount); updateTarget(); }
    frame.current = requestAnimationFrame(tick);
  }, [updateTarget]);
  const onPointerDown = useCallback((event, id) => {
    if (event.button !== 0 || !event.isPrimary) return;
    if (event.pointerType === "touch" && !event.target.closest(".gallery-editor-drag-handle")) return;
    select(id);
    const image = event.currentTarget.querySelector("img");
    gesture.current = { id, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, active: false, src: image?.currentSrc || image?.src };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }, [select]);
  const onPointerMove = useCallback((event) => {
    const current = gesture.current;
    if (!current) return;
    current.x = event.clientX;
    current.y = event.clientY;
    if (!current.active && Math.hypot(current.x - current.startX, current.y - current.startY) < 5) return;
    if (!current.active) {
      current.active = true;
      frame.current = requestAnimationFrame(autoScroll);
    }
    event.preventDefault();
    updateTarget();
  }, [autoScroll, updateTarget]);
  const onPointerUp = useCallback(() => {
    const current = gesture.current;
    if (current?.active && current.target) {
      commit(movePhoto(imageRef.current.map(({ id }) => id), current.id, current.target.id, current.target.placement));
    }
    cancel();
  }, [cancel, commit]);
  const onKeyDown = useCallback((event, id) => {
    if (event.altKey && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      commit(movePhotoByStep(imageRef.current.map((image) => image.id), id, ["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1));
      select(id);
    }
  }, [commit, select]);
  const editor = useMemo(() => ({ enabled, selectedId, dragId: drag?.id, target, select, onPointerDown, onPointerMove, onPointerUp, onPointerCancel: cancel, onKeyDown }),
    [enabled, selectedId, drag?.id, target, select, onPointerDown, onPointerMove, onPointerUp, cancel, onKeyDown]);
  const portraitFrameRatio = images.reduce((ratio, image) => image.width < image.height ? Math.max(ratio, image.width / image.height) : ratio, 3 / 4);

  return (
    <div data-gallery-editor-preview={enabled ? "editing" : "browsing"} onDragStart={(event) => { if (enabled) event.preventDefault(); }}>
      <GalleryController images={images} portraitFrameRatio={portraitFrameRatio} editor={editor}>
        <div className="gallery-grid">
          {images.map((image, index) => <ImageCard key={image.id} img={image} index={index} eager={index < 8} />)}
        </div>
      </GalleryController>
      {drag && <div className="gallery-editor-ghost" style={{ left: Math.min(drag.x + 18, window.innerWidth - 136), top: drag.y + 18 }}>
        {/* This temporary drag preview reuses the already loaded thumbnail. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={drag.src} alt="" draggable={false} />
        <span>移动照片</span>
      </div>}
    </div>
  );
}
