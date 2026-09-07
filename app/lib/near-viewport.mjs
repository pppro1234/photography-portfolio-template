// A shared observer keeps the number of observers constant as the gallery grows.
const callbacks = new Map();
let observer;
const buffer = 300;

export function observeNearViewport(element, onChange) {
  if (typeof IntersectionObserver === "undefined") {
    onChange(true);
    return () => {};
  }

  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          callbacks.get(entry.target)?.(entry.isIntersecting);
        }
      },
      { rootMargin: `${buffer}px 0px`, threshold: 0 }
    );
  }

  callbacks.set(element, onChange);
  // Seed before paint, including restored scroll positions; don't wait for IO.
  const rect = element.getBoundingClientRect();
  onChange(rect.bottom >= -buffer && rect.top <= window.innerHeight + buffer);
  observer.observe(element);

  return () => {
    callbacks.delete(element);
    observer?.unobserve(element);
    if (callbacks.size === 0) {
      observer?.disconnect();
      observer = undefined;
    }
  };
}

export function getCardScrollProgress(element, scrollY, viewportHeight) {
  // Match Motion's "start end" / "end start" offsets, ignoring reveal transforms.
  let top = 0;
  let current = element;
  while (current) {
    top += current.offsetTop;
    current = current.offsetParent;
  }
  const progress = (scrollY + viewportHeight - top) / (viewportHeight + element.clientHeight);
  return Math.max(0, Math.min(1, progress));
}
