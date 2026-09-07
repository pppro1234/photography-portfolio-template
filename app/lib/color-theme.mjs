export const THEME_STORAGE_KEY = "portfolio-color-theme";

export function normalizeTheme(value) {
  return value === "light" || value === "dark" ? value : "system";
}

export function resolveTheme(preference, systemDark) {
  return normalizeTheme(preference) === "system" ? (systemDark ? "dark" : "light") : preference;
}

export function nextTheme(preference, systemDark) {
  // The first click always changes the visible theme, even in automatic mode.
  const cycle = ["system", systemDark ? "light" : "dark", systemDark ? "dark" : "light"];
  return cycle[(cycle.indexOf(normalizeTheme(preference)) + 1) % cycle.length];
}

export function readTheme(storage) {
  try { return normalizeTheme(storage.getItem(THEME_STORAGE_KEY)); }
  catch { return "system"; }
}

export function saveTheme(storage, preference) {
  try {
    if (normalizeTheme(preference) === "system") storage.removeItem(THEME_STORAGE_KEY);
    else storage.setItem(THEME_STORAGE_KEY, preference);
  } catch { /* A blocked preference store must not prevent this page switching. */ }
}

export function applyTheme(document, preference, syncMetadata = true) {
  const theme = preference === "light" || preference === "dark" ? preference : "system";
  if (theme === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", theme);

  // Leave React-owned head nodes untouched until hydration has completed.
  if (!syncMetadata) return;
  // Update both framework-owned media variants, including after route changes.
  document.querySelectorAll('meta[name="theme-color"][media]').forEach((meta) => {
    const dark = theme === "dark" || (theme === "system" && meta.getAttribute("media").includes("dark"));
    meta.setAttribute("content", dark ? "#000000" : "#ffffff");
  });
}

// Run before page content paints; the same application logic is used after hydration.
export const themeInitScript = `(()=>{try{(${applyTheme.toString()})(document,localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}),false)}catch{}})()`;
