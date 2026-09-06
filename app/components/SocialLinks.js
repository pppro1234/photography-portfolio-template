import { Instagram } from "lucide-react";
import { motion } from "framer-motion";
import profiles from "../social-profiles.json";
import site from "../site-config.json";

const platforms = [
  { id: "instagram", label: "Instagram" },
  { id: "douyin", label: "抖音", iconSize: "size-5", icon: "tiktok" },
  { id: "xiaohongshu", label: "小红书", iconSize: "size-8" },
].filter(({ id }) => /^https?:\/\//i.test(profiles[id] || ""));

export const hasSocialProfiles = platforms.length > 0;

export default function SocialLinks({ variant = "footer", onNavigate, iconScale }) {
  if (!hasSocialProfiles) return null;

  const isFooter = variant === "footer";
  const linkClassName = isFooter
    ? "grid size-12 place-items-center rounded-full border border-white/25 text-white/80 transition-colors hover:border-white hover:bg-white hover:text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
    : "grid size-11 place-items-center rounded-full text-neutral-500 transition-colors hover:bg-black/5 hover:text-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black";

  return (
    <ul
      id={isFooter ? "social-profiles" : undefined}
      aria-label="Social profiles"
      className={`flex items-center ${isFooter ? "mt-7 gap-3" : "gap-1"}`}
    >
      {platforms.map(({ id, label, iconSize, icon }) => (
        <li key={id}>
          <a
            href={profiles[id]}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${label} — ${site.name} (opens in a new tab)`}
            title={label}
            onClick={onNavigate}
            className={linkClassName}
          >
            <motion.span style={{ scale: iconScale }} className="block origin-center">
              {id === "instagram" ? (
                <Instagram size={20} strokeWidth={1.6} aria-hidden="true" />
              ) : (
                <span
                  aria-hidden="true"
                  className={`${iconSize} block bg-current`}
                  style={{
                    mask: `url(/icons/${icon || id}.svg) center / contain no-repeat`,
                    WebkitMask: `url(/icons/${icon || id}.svg) center / contain no-repeat`,
                  }}
                />
              )}
            </motion.span>
          </a>
        </li>
      ))}
    </ul>
  );
}
