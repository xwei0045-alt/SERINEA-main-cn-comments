import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-barlow"
});

const condensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
  variable: "--font-condensed"
});

export const metadata: Metadata = {
  title: "SERINEA — The 15 minute map",
  description:
    "Drop a pin in a small town. See food, shops, gyms, groceries, GPs, pharmacies, parks and more you can reach by public transport — and get back from — in 15 minutes."
};

export const viewport = {
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${barlow.variable} ${condensed.variable}`}>
        {/*
          THESIS: Home sells the fifteen-minute round-trip idea with cinematic scroll — atlas hero, problem split, demo stage, explore cards, trust shells, how, CTA — then opens /map.
          OWN-WORLD: Street-directory atlas paper, square pins, overlay radius, arterial accents, Barlow Condensed, demo badges.
          STORY: Visitor understands nearby-vs-return, explores the concept, trusts what is not invented, opens the map.
          FIRST VIEWPORT: Living atlas + SERINEA welcome + Open the map search.
          FORM: Melbourne street directory (seed 202dbcb7) as the visual world; UX craft inspired by premium AU discovery storytelling without changing product truth.
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
