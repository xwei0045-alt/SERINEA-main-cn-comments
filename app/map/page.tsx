import type { Metadata } from "next";
import { Suspense } from "react";
import { Chrome } from "../components/Chrome";
import MapApp from "./MapApp";

export const metadata: Metadata = {
  title: "Map - SERINEA 15 minute map",
  description:
    "Drop a pin in regional Victoria. See parks, groceries, doctors, hospitals, schools and more within a 15-minute walk there and back."
};

export default function MapPage() {
  return (
    <div className="tool">
      <Chrome current="map" />
      <main id="content">
        <Suspense fallback={<p className="banner">Loading map…</p>}>
          <MapApp />
        </Suspense>
      </main>
    </div>
  );
}
