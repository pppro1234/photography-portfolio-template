const platforms = [
  { id: "instagram", label: "Instagram" },
  { id: "douyin", label: "Douyin", iconSize: "size-5", icon: "tiktok" },
  { id: "xiaohongshu", label: "Xiaohongshu", iconSize: "size-8" },
];

export function getSocialLinks(profiles = {}) {
  return platforms.flatMap((platform) => {
    const href = typeof profiles[platform.id] === "string" ? profiles[platform.id].trim() : "";
    try {
      const url = new URL(href);
      if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return [];
      return [{ ...platform, href }];
    } catch {
      return [];
    }
  });
}
