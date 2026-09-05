import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Bodoni_Moda, Instrument_Serif, Syne } from "next/font/google";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-syne"
});

const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-bodoni"
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-instrument"
});

export const metadata: Metadata = {
  title: "SERINEA — Fifteen-minute walk",
  description:
    "An honest reach map for regional Victoria. See what you can walk to from your pin in fifteen minutes."
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${syne.variable} ${bodoni.variable} ${instrument.variable}`}>
        {/*
          THESIS: SERINEA as an editorial pastoral journal — regional Victoria reach framed like a gallery prospectus, not a SaaS map dashboard.
          OWN-WORLD: forest green, cream, mist blue, soft gold; Bodoni Moda brand + Instrument Serif display + Syne UI; framed plates and long scroll.
          STORY: Fifteen-minute walk from your pin; open the map or compare towns; product truth only.
          FIRST VIEWPORT: Full-bleed pastoral hero; centered cream plate with SERINEA; Explore CTA.
          FORM: User-pinned SERINGA-style editorial (cream/forest/serif); product facts remain SERINEA.
          FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
        */}
        <a className="skip" href="#content">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
