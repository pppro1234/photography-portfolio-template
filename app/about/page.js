import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import config from "../about-content.json";
import gallery from "../gallery-data.json";
import { site, contactLinks } from "../lib/site-content";
import { resolveAboutContent } from "../lib/about-content.mjs";
import { validateGalleryImages } from "../lib/gallery-data.mjs";
import AboutReveal from "../components/AboutReveal";

export const metadata = {
  title: `About — ${site.name}`,
  description: site.description,
};

export default function AboutPage() {
  const about = resolveAboutContent(config, site, validateGalleryImages(gallery));
  return (
    <main id="main-content" tabIndex={-1} className="about-page">
      <noscript><style>{".about-reveal{opacity:1!important;transform:none!important}"}</style></noscript>
      <section aria-labelledby="about-title" className="about-intro">
        <AboutReveal as="p" className="page-eyebrow">About</AboutReveal>
        <AboutReveal as="h1" order={1} id="about-title">{about.title}</AboutReveal>
      </section>
      <section className={`about-story${about.image ? "" : " about-story-text-only"}`} aria-label="About the photographer">
        {about.image && <AboutReveal as="figure" order={1} media className="about-photograph">
          <Image src={about.image.src} alt={about.imageAlt} width={about.image.width} height={about.image.height}
            sizes="(min-width: 1400px) 668px, (min-width: 768px) 50vw, 100vw" priority />
          <figcaption>{about.imageCaption}</figcaption>
        </AboutReveal>}
        <div className="about-copy">
          <AboutReveal as="p" order={1} className="about-statement">{about.statement}</AboutReveal>
          <AboutReveal as="h2" order={2} className="brand-wordmark">{about.name}</AboutReveal>
          <AboutReveal as="p" order={3} className="about-description">{about.introduction}</AboutReveal>
          <AboutReveal as="p" order={4} className="about-description">{about.invitation}</AboutReveal>
          <AboutReveal order={5}>
            <Link href="/" className="about-work-link">Explore the work<ArrowRight size={17} aria-hidden="true" /></Link>
          </AboutReveal>
          {contactLinks.length > 0 && <AboutReveal as="nav" order={6} aria-label="Photographer social profiles" className="about-social-links">
            {contactLinks.map(({ label, href }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label} — ${site.name} (opens in a new tab)`}>
                {label}<ArrowUpRight size={14} aria-hidden="true" />
              </a>
            ))}
          </AboutReveal>}
        </div>
      </section>
    </main>
  );
}
