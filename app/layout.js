import { Archivo } from "next/font/google";
import "./globals.css";
import "./gallery.css";
import "./navigation.css";
import "./footer.css";
import SiteHeader from "./components/SiteHeader";
import MotionProvider from "./components/MotionProvider";
import Footer from "./components/Footer";
import { motionCssVariables } from "./lib/motion-tokens.mjs";
import { themeInitScript } from "./lib/color-theme.mjs";
import site from "./site-config.json";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["300", "400"],
  display: "swap",
});

export const metadata = {
  title: site.name,
  description: site.description,
};

export const viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={archivo.variable} style={motionCssVariables} suppressHydrationWarning>
      <head><script id="theme-init" dangerouslySetInnerHTML={{ __html: themeInitScript }} /></head>
      <body className="antialiased">
        <MotionProvider>
          <div id="site-stage">
            <div id="site-scene">
              <SiteHeader />
              <div id="site-content">
                {children}
                <Footer />
              </div>
            </div>
          </div>
        </MotionProvider>
      </body>
    </html>
  );
}
