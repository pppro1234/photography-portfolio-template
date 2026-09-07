"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Monitor, Moon, Sun } from "lucide-react";
import { applyTheme, nextTheme, readTheme, resolveTheme, saveTheme, THEME_STORAGE_KEY } from "../lib/color-theme.mjs";

const labels = { system: "System", light: "Light", dark: "Dark" };

export default function ThemeSwitch({ onInteract }) {
  const pathname = usePathname();
  const buttonRef = useRef(null);
  const [preference, setPreference] = useState("system");
  const [systemDark, setSystemDark] = useState(false);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncStoredTheme = () => {
      // Some browsers throw even when accessing the localStorage property.
      let stored = "system";
      try { stored = readTheme(window.localStorage); } catch { /* Use system. */ }
      applyTheme(document, stored);
      setPreference(stored);
    };
    const syncSystem = () => setSystemDark(media.matches);
    const syncStorage = (event) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) {
        buttonRef.current?.setAttribute("data-theme-motion", "true");
        syncStoredTheme();
      }
    };
    syncStoredTheme();
    syncSystem();
    setReady(true);
    media.addEventListener("change", syncSystem);
    window.addEventListener("storage", syncStorage);
    return () => {
      media.removeEventListener("change", syncSystem);
      window.removeEventListener("storage", syncStorage);
    };
  }, []);

  useLayoutEffect(() => {
    if (ready) applyTheme(document, preference);
  }, [preference, pathname, ready]);

  const next = nextTheme(preference, systemDark);
  const current = preference === "system" ? `System (${resolveTheme(preference, systemDark)})` : labels[preference];
  const label = ready ? `Theme: ${current}. Switch to ${labels[next]}.` : "Change color theme";

  return (
    <button ref={buttonRef} type="button" className="theme-switch" aria-label={label} title={label}
      onFocus={onInteract} onPointerEnter={onInteract}
      onClick={(event) => {
        onInteract?.();
        // Bootstrap/storage restore stays instant; animate only subsequent changes.
        event.currentTarget.setAttribute("data-theme-motion", "true");
        // Read the current media value at activation, not a potentially stale render.
        const selected = nextTheme(preference, window.matchMedia("(prefers-color-scheme: dark)").matches);
        applyTheme(document, selected);
        setPreference(selected);
        try { saveTheme(window.localStorage, selected); } catch { /* Keep this page's choice. */ }
      }}>
      <span className="theme-switch-glyph" aria-hidden="true">
        <Monitor className="theme-icon theme-icon-system" size={17} strokeWidth={1.4} />
        <Sun className="theme-icon theme-icon-light" size={17} strokeWidth={1.4} />
        <Moon className="theme-icon theme-icon-dark" size={17} strokeWidth={1.4} />
      </span>
    </button>
  );
}
