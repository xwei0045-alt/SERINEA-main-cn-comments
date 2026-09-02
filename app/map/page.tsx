import type { Metadata } from "next";
import { Chrome } from "../components/Chrome";
import MapApp from "./MapApp";

export const metadata: Metadata = {
  title: "Map — SERINEA 15 minute map",
  description:
    "Drop a pin in regional Victoria. See parks, groceries, doctors, pharmacies and gyms within a 15-minute walk there and back."
};

export default function MapPage() {
  return (
    <div className="tool">
      <Chrome current="map" />
      <main id="content">
        <MapApp />
      </main>
    </div>
  );
}
