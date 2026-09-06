"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import SocialLinks, { hasSocialProfiles } from "./SocialLinks";

export default function HeaderSocialLinks({ y, iconScale }) {
  const [isOpen, setIsOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const containerRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };
    const desktop = window.matchMedia("(min-width: 768px)");
    const handleBreakpointChange = () => {
      if (desktop.matches) setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    desktop.addEventListener("change", handleBreakpointChange);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      desktop.removeEventListener("change", handleBreakpointChange);
    };
  }, [isOpen]);

  if (!hasSocialProfiles) return null;

  return (
    <motion.div
      style={{ y }}
      className="pointer-events-auto absolute right-4 top-0 md:right-8"
    >
      <nav aria-label="Contact" className="hidden md:block">
        <SocialLinks variant="header" iconScale={iconScale} />
      </nav>
      <div
        ref={containerRef}
        className="relative md:hidden"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false);
        }}
      >
        <button
          ref={buttonRef}
          type="button"
          aria-label={isOpen ? "Close contact links" : "Contact"}
          aria-expanded={isOpen}
          aria-controls="mobile-contact-links"
          title="Contact"
          onClick={() => setIsOpen((open) => !open)}
          className="grid size-11 cursor-pointer place-items-center bg-transparent text-neutral-500 transition-colors hover:text-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        >
          <motion.span style={{ scale: iconScale }} className="block origin-center">
            {isOpen ? <X size={20} aria-hidden="true" /> : <MessageCircle size={20} strokeWidth={1.6} aria-hidden="true" />}
          </motion.span>
        </button>
        <motion.nav
          id="mobile-contact-links"
          aria-label="Contact platforms"
          aria-hidden={!isOpen}
          inert={!isOpen}
          initial={false}
          animate={isOpen ? "open" : "closed"}
          variants={{
            open: { opacity: 1, y: 0, visibility: "visible" },
            closed: {
              opacity: 0,
              y: shouldReduceMotion ? 0 : 6,
              transitionEnd: { visibility: "hidden" },
            },
          }}
          transition={{
            duration: shouldReduceMotion ? 0 : isOpen ? 0.2 : 0.14,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{ pointerEvents: isOpen ? "auto" : "none" }}
          className="absolute right-0 top-full mt-3 rounded-2xl border border-black/10 bg-white/75 p-2 shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md"
        >
          <SocialLinks
            variant="header"
            onNavigate={() => {
              setIsOpen(false);
              buttonRef.current?.focus();
            }}
          />
        </motion.nav>
      </div>
    </motion.div>
  );
}
