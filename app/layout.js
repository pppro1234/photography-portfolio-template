import { Archivo } from "next/font/google";
import "./globals.css";
import "./gallery.css";
import "./navigation.css";
import "./footer.css";
import SiteHeader from "./components/SiteHeader";
import MotionProvider from "./components/MotionProvider";
import Footer from "./components/Footer";
import { motionCssVariables } from "./lib/motion-tokens.mjs";
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

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={archivo.variable} style={motionCssVariables}>
      <body className="antialiased">
        <MotionProvider>
          <SiteHeader />
          <div id="site-content">
            {children}
            <Footer />
          </div>
        </MotionProvider>
      </body>
    </html>
  );
}
