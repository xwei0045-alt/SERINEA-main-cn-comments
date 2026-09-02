import type { Metadata } from "next";
import { Chrome } from "../components/Chrome";
import MapApp from "./MapApp";

export const metadata: Metadata = {
  title: "Map — SERINEA 15 minute map",
  description:
    "Drop a pin. See Melbourne places reachable by public transport in a 15-minute round trip."
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
