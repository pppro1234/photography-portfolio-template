export function createReducedMotionStore(matchMedia) {
  let media;
  const getMedia = () => media ??= matchMedia();
  return {
    getSnapshot: () => getMedia()?.matches ?? false,
    getServerSnapshot: () => false,
    subscribe(onChange) {
      const query = getMedia();
      query?.addEventListener("change", onChange);
      return () => query?.removeEventListener("change", onChange);
    },
  };
}
