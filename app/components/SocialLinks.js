import { Instagram } from "lucide-react";
import { site, contactLinks as platforms } from "../lib/site-content";

export const hasSocialProfiles = platforms.length > 0;

export default function SocialLinks({
  variant = "footer",
  onNavigate,
  iconScale,
  IconWrapper = "span",
}) {
  if (!hasSocialProfiles) return null;
  const isFooter = variant === "footer";
  const linkClassName = isFooter
    ? "grid size-12 place-items-center text-white/70 motion-color-feedback hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
    : "grid size-11 place-items-center text-neutral-500 motion-color-feedback hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black";

  return (
    <ul
      id={isFooter ? "social-profiles" : undefined}
      aria-label="Social profiles"
      className={`flex items-center ${isFooter ? "mt-7 gap-3" : "gap-1"}`}
    >
      {platforms.map(({ id, label, iconSize, icon, href }) => (
        <li key={id}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${label} — ${site.name} (opens in a new tab)`}
            title={label}
            onClick={onNavigate}
            className={linkClassName}
          >
            <IconWrapper
              style={iconScale === undefined ? undefined : { scale: iconScale }}
              className="block origin-center"
            >
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
            </IconWrapper>
          </a>
        </li>
      ))}
    </ul>
  );
}
