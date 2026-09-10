"use client";

import Link from "./SiteLink";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { m as motion } from "framer-motion";
import { useIntroMotion } from "./IntroMotionProvider";
import { galleryCategories, getCategoryHref } from "../lib/gallery-categories.mjs";
import { createHoverIntent, getNavigationDuration, getNavigationPhaseDuration, initialNavigationState, navigationReducer, NAV_SWITCH_DURATION, NAV_SWITCH_HEIGHT_DURATION } from "../lib/navigation-motion.mjs";
import { MOTION_DURATION } from "../lib/motion-tokens.mjs";
import { site, contactLinks } from "../lib/site-content";
import IntroCopyMotion from "./IntroCopyMotion";
import ThemeSwitch from "./ThemeSwitch";

const workLinks = [{ slug: "all", label: "All work" }, ...galleryCategories];

const panelIds = { work: "work-navigation", about: "about-navigation", mobile: "mobile-navigation" };

export default function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const { brandTransform, surfaceOpacity, navigationOpacity, navigationY, navigationBlur, navigationVisibility, navigationInteractive, navigationPointerEvents, menuProgress, shouldReduceMotion, homeReturnPhase, startHomeReturn, navigationExit, navigationExitBlur } = useIntroMotion();
  const [navigationReady, setNavigationReady] = useState(() => navigationInteractive.get());
  const [{ menu, phase }, dispatch] = useReducer(navigationReducer, initialNavigationState);
  const [geometry, setGeometry] = useState({ height: 0, duration: MOTION_DURATION.control });
  const headerRef = useRef(null);
  const panelRefs = useRef({});
  const triggerRef = useRef(null);
  const focusFirstRef = useRef(null);
  const lastMenuRef = useRef(null);
  const isOpen = menu !== null;
  const isMobileOpen = menu === "mobile";
  const homeReturnWaiting = homeReturnPhase === "pending" || homeReturnPhase === "waiting";
  const isWork = pathname === "/" || pathname.startsWith("/work/");
  const hoverIntent = useMemo(() => createHoverIntent((nextMenu) => dispatch({ type: "select", menu: nextMenu })), []);

  const closeMenu = useCallback(() => {
    hoverIntent.cancel();
    focusFirstRef.current = null;
    dispatch({ type: "select", menu: null });
  }, [hoverIntent]);

  useEffect(() => { closeMenu(); }, [pathname, closeMenu]);
  useEffect(() => () => hoverIntent.cancel(), [hoverIntent]);
  useLayoutEffect(() => {
    // Update React only when the interaction threshold changes, not each frame.
    let disposed = false;
    setNavigationReady(navigationInteractive.get());
    // Motion also refreshes derived values while its provider renders.
    const unsubscribe = navigationInteractive.on("change", () => queueMicrotask(() => {
      if (!disposed) setNavigationReady(navigationInteractive.get());
    }));
    return () => { disposed = true; unsubscribe(); };
  }, [navigationInteractive]);
  useLayoutEffect(() => {
    // Keep the single home wordmark clear of the flyout until it has closed.
    menuProgress.set(phase === "closed" ? 0 : 1);
  }, [phase, menuProgress]);

  useLayoutEffect(() => {
    if (phase === "closed" && homeReturnPhase === "waiting") startHomeReturn();
  }, [phase, homeReturnPhase, startHomeReturn]);

  useEffect(() => {
    const breakpoint = window.matchMedia("(max-width: 833px)");
    const reset = () => {
      hoverIntent.cancel();
      focusFirstRef.current = null;
      dispatch({ type: "reset" });
    };
    breakpoint.addEventListener("change", reset);
    return () => breakpoint.removeEventListener("change", reset);
  }, [hoverIntent]);

  useLayoutEffect(() => {
    if (!menu) return;
    lastMenuRef.current = menu;
    const panel = panelRefs.current[menu];
    const measure = () => {
      const height = panel?.scrollHeight || 0;
      const duration = getNavigationDuration(menu === "mobile" ? window.innerHeight : height);
      setGeometry((previous) => previous.height === height && previous.duration === duration ? previous : { height, duration });
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (panel) observer.observe(panel);
    window.addEventListener("resize", measure);
    if (focusFirstRef.current === menu) {
      panel?.querySelector("a[href]")?.focus({ preventScroll: true });
      focusFirstRef.current = null;
    }
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [menu]);

  useEffect(() => {
    if (phase === "closed" || phase === "open") return;
    const duration = shouldReduceMotion ? 0 : getNavigationPhaseDuration(phase, geometry.duration, lastMenuRef.current === "mobile");
    const timer = window.setTimeout(() => dispatch({ type: "settle", menu, phase }), duration);
    return () => window.clearTimeout(timer);
  }, [menu, phase, geometry.height, geometry.duration, shouldReduceMotion]);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event) => {
      if (!headerRef.current?.contains(event.target)) closeMenu();
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        triggerRef.current?.focus({ preventScroll: true });
      }
      if (event.key === "Tab" && isMobileOpen) {
        const focusable = [...headerRef.current.querySelectorAll("a[href], button:not(:disabled)")]
          .filter((element) => !element.closest('[inert], [aria-hidden="true"]') && element.getClientRects().length > 0);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && (document.activeElement === first || !headerRef.current.contains(document.activeElement))) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !headerRef.current.contains(document.activeElement))) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    const onScroll = () => { if (!isMobileOpen) closeMenu(); };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll);
    };
  }, [isOpen, isMobileOpen, closeMenu]);

  useEffect(() => {
    if (!isMobileOpen) return;
    const content = document.getElementById("site-content");
    const previousOverflow = document.body.style.overflow;
    const previousInert = content?.inert;
    document.body.style.overflow = "hidden";
    if (content) content.inert = true;
    return () => {
      document.body.style.overflow = previousOverflow;
      if (content) content.inert = previousInert;
    };
  }, [isMobileOpen]);

  const enterMenu = (nextMenu, event) => {
    if (event.pointerType !== "mouse") return;
    triggerRef.current = event.currentTarget;
    hoverIntent.schedule(nextMenu);
  };

  const selectMenu = (nextMenu, event) => {
    hoverIntent.cancel();
    triggerRef.current = event.currentTarget;
    // A mouse click must not close the flyout that its own hover just opened.
    const hoveredMouseClick = event.detail > 0 && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    dispatch({ type: "select", menu: menu === nextMenu && !hoveredMouseClick ? null : nextMenu });
  };

  const openWithKeyboard = (nextMenu, event) => {
    if (event.key !== "ArrowDown") return;
    event.preventDefault();
    hoverIntent.cancel();
    triggerRef.current = event.currentTarget;
    if (menu === nextMenu) panelRefs.current[nextMenu]?.querySelector("a[href]")?.focus();
    else {
      focusFirstRef.current = nextMenu;
      dispatch({ type: "select", menu: nextMenu });
    }
  };

  const renderWorkLinks = () => workLinks.map(({ slug, label }, index) => (
    <Link key={slug} href={getCategoryHref(slug)} onClick={closeMenu} className="nav-stagger"
      style={{ "--item-index": index + 2 }} aria-current={pathname === getCategoryHref(slug) ? "page" : undefined}>
      <span className="nav-link-label">{label}</span>
    </Link>
  ));

  const renderAboutLinks = (offset = 2) => (
    <div className="nav-about-links">
      <Link href="/about" className="nav-bio-link nav-stagger" style={{ "--item-index": offset }}
        aria-current={pathname === "/about" ? "page" : undefined} onClick={closeMenu}>
        <span className="nav-link-label">Bio</span>
      </Link>
      {contactLinks.map(({ label, href }, index) => (
        <a key={label} href={href} target="_blank" rel="noopener noreferrer" onClick={closeMenu}
          className="nav-stagger" style={{ "--item-index": offset + index + 1 }} aria-label={`${label} — ${site.name} (opens in a new tab)`}>
          <span className="nav-link-label">{label}</span><ArrowUpRight size={14} aria-hidden="true" />
        </a>
      ))}
    </div>
  );

  return (
    <>
      <div className="nav-curtain" data-open={isOpen} aria-hidden="true" />
      <motion.header className="site-header" ref={headerRef} data-home={isHome} data-expanded={isOpen} data-phase={phase} data-mobile-open={isMobileOpen}
        style={{ "--home-nav-opacity": isHome ? surfaceOpacity : 1, "--panel-height": `${geometry.height}px`, "--panel-duration": `${geometry.duration}ms`, "--panel-switch-duration": `${NAV_SWITCH_HEIGHT_DURATION}ms`, "--panel-crossfade-duration": `${NAV_SWITCH_DURATION}ms` }}
        onPointerLeave={(event) => {
          hoverIntent.cancel();
          if (event.pointerType === "mouse" && !isMobileOpen && !document.activeElement?.closest(".nav-panel")) closeMenu();
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) closeMenu();
        }}>
        <a href="#main-content" className="skip-link" onClick={closeMenu} aria-hidden={isMobileOpen || undefined} tabIndex={isMobileOpen ? -1 : undefined}>Skip to content</a>
        <div className="site-nav-inner">
          {isHome ? (
            <div className="site-nav-brand-slot">
              {homeReturnPhase !== "idle" && (
                <motion.span aria-hidden="true" className="home-return-nav-brand brand-wordmark"
                  style={{ opacity: navigationExit, filter: navigationExitBlur }}>{site.name}</motion.span>
              )}
              <motion.h1 className="home-nav-wordmark site-nav-brand brand-wordmark" style={{ transform: brandTransform }} aria-hidden={isMobileOpen || homeReturnWaiting || undefined}>
                <Link href="/" aria-label={`${site.name} home`} onClick={closeMenu}
                  aria-hidden={isMobileOpen || homeReturnWaiting || undefined} tabIndex={isMobileOpen || homeReturnWaiting ? -1 : undefined}
                  onPointerEnter={(event) => { if (event.pointerType === "mouse") closeMenu(); }}><IntroCopyMotion category="all">{site.name}</IntroCopyMotion></Link>
              </motion.h1>
            </div>
          ) : (
            <Link href="/" className="site-nav-brand brand-wordmark" aria-label={`${site.name} home`} onClick={closeMenu}
              aria-hidden={isMobileOpen || undefined} tabIndex={isMobileOpen ? -1 : undefined}
              onPointerEnter={(event) => { if (event.pointerType === "mouse") closeMenu(); }}>{site.name}</Link>
          )}
          <motion.div className="site-nav-controls motion-blur-content" inert={isHome && !navigationReady} aria-hidden={isHome && !navigationReady || undefined} style={{
            opacity: isHome ? navigationOpacity : 1,
            y: isHome && !shouldReduceMotion ? navigationY : 0,
            filter: isHome && !shouldReduceMotion ? navigationBlur : "none",
            visibility: isHome ? navigationVisibility : "visible",
            pointerEvents: isHome ? navigationPointerEvents : "auto",
          }}>
            <nav className="desktop-navigation" aria-label="Main navigation">
              <button type="button" className="nav-item" data-current={isWork} aria-expanded={menu === "work"} aria-controls={panelIds.work}
                onPointerEnter={(event) => enterMenu("work", event)} onClick={(event) => selectMenu("work", event)} onKeyDown={(event) => openWithKeyboard("work", event)}><span className="nav-item-label">Work</span></button>
              <button type="button" className="nav-item" data-current={pathname === "/about"} aria-expanded={menu === "about"} aria-controls={panelIds.about}
                onPointerEnter={(event) => enterMenu("about", event)} onClick={(event) => selectMenu("about", event)} onKeyDown={(event) => openWithKeyboard("about", event)}><span className="nav-item-label">About</span></button>
            </nav>
            <ThemeSwitch onInteract={() => hoverIntent.cancel()} />
            <button type="button" className="mobile-menu-toggle" aria-label={isMobileOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={isMobileOpen} aria-controls={panelIds.mobile} onClick={(event) => {
                hoverIntent.cancel();
                triggerRef.current = event.currentTarget;
                dispatch({ type: "select", menu: isMobileOpen ? null : "mobile" });
              }}>
              <span className="nav-menu-glyph" aria-hidden="true"><span className="nav-menu-line nav-menu-line-top"><span /></span><span className="nav-menu-line nav-menu-line-bottom"><span /></span></span>
            </button>
          </motion.div>
        </div>
        <div className="nav-expander">
          <div id={panelIds.work} className="nav-panel desktop-panel" data-active={menu === "work"} aria-hidden={menu !== "work"} inert={menu !== "work"}>
            <nav className="nav-panel-inner" ref={(element) => { panelRefs.current.work = element; }} aria-label="Photography categories" style={{ "--item-total": workLinks.length + 2 }}>
              <p className="nav-panel-label nav-stagger" style={{ "--item-index": 0 }}>Explore the photographs</p>
              <div className="nav-work-links">{renderWorkLinks()}</div>
            </nav>
          </div>
          <div id={panelIds.about} className="nav-panel desktop-panel" data-active={menu === "about"} aria-hidden={menu !== "about"} inert={menu !== "about"}>
            <nav className="nav-panel-inner" ref={(element) => { panelRefs.current.about = element; }} aria-label="About and social profiles" style={{ "--item-total": contactLinks.length + 3 }}>
              <p className="nav-panel-label nav-stagger" style={{ "--item-index": 0 }}>About the studio</p>
              {renderAboutLinks()}
            </nav>
          </div>
          <div id={panelIds.mobile} className="nav-panel mobile-panel" data-active={isMobileOpen} aria-hidden={!isMobileOpen} inert={!isMobileOpen}>
            <nav className="nav-panel-inner" ref={(element) => { panelRefs.current.mobile = element; }} aria-label="Mobile navigation" style={{ "--item-total": workLinks.length + contactLinks.length + 4 }}>
              <p className="nav-panel-label nav-stagger" style={{ "--item-index": 0 }}>Work</p>
              <div className="nav-work-links">{renderWorkLinks()}</div>
              <div className="mobile-about-section">
                <p className="nav-panel-label nav-stagger" style={{ "--item-index": workLinks.length + 2 }}>About</p>
                {renderAboutLinks(workLinks.length + 3)}
              </div>
            </nav>
          </div>
        </div>
      </motion.header>
    </>
  );
}
