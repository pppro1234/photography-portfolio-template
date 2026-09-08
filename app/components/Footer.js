import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { galleryCategories, getCategoryHref } from "../lib/gallery-categories.mjs";
import { site, contactLinks } from "../lib/site-content";

const workLinks = [{ slug: "all", label: "All work" }, ...galleryCategories];

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <h3 className="brand-wordmark text-2xl mb-6">{site.name}</h3>
          <p className="text-gray-400 max-w-sm font-light leading-relaxed">
            {site.tagline}
          </p>
        </div>
        <nav aria-label="Footer navigation" className="footer-navigation">
          <div className="footer-link-group">
            <h4 className="footer-group-title">Work</h4>
            <ul>
              {workLinks.map(({ slug, label }) => (
                <li key={slug}><Link href={getCategoryHref(slug)} className="footer-link"><span className="footer-link-label">{label}</span></Link></li>
              ))}
            </ul>
          </div>
          <div className="footer-link-group">
            <h4 className="footer-group-title">About</h4>
            <ul>
              <li><Link href="/about" className="footer-link"><span className="footer-link-label">About the studio</span></Link></li>
              {contactLinks.map(({ label, href }) => (
                <li key={label}><a href={href} target="_blank" rel="noopener noreferrer" className="footer-link"
                  aria-label={`${label} — ${site.name} (opens in a new tab)`}>
                  <span className="footer-link-label">{label}</span><ArrowUpRight size={12} aria-hidden="true" />
                </a></li>
              ))}
            </ul>
          </div>
        </nav>
      </div>
      <div className="footer-copyright text-xs text-neutral-400 uppercase tracking-wider">
        <span>© {new Date().getFullYear()} {site.name}</span>
      </div>
    </footer>
  );
}
