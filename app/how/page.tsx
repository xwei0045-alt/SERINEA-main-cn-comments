import Link from "next/link";
import { Chrome } from "../components/Chrome";

export const metadata = {
  title: "How it works — SERINEA",
  description: "Drop a pin. Fifteen minutes, round trip, on public transport."
};

export default function HowPage() {
  return (
    <div className="how">
      <Chrome current="how" />
      <main id="content">
        <h1>How to read the 15 minute map</h1>
        <p className="lead">
          One pin. One window. The index only lists places you can reach by public
          transport and still get back from in fifteen minutes.
        </p>
        <ul className="read-key" aria-label="How to read the plate">
          <li>
            <span className="key-overlay" aria-hidden="true" />
            Solid overlay — fifteen minutes there and back
          </li>
          <li>
            <span className="key-listed" aria-hidden="true" />
            Filled mark — listed in the index
          </li>
          <li>
            <span className="key-ghost" aria-hidden="true" />
            Open mark — outbound fits, return does not, omitted
          </li>
          <li>
            <span className="key-pin" aria-hidden="true" />
            Red square — the pin
          </li>
        </ul>
        <ol>
          <li>
            <h2>Drop a pin</h2>
            <p>
              Click the map, or use your location. If you decline, the pin sits at
              Flinders Street, Melbourne. A pin in the bay or a lake is called out
              plainly — there is no service on water.
            </p>
          </li>
          <li>
            <h2>The window is fifteen minutes</h2>
            <p>
              Not thirty. Not sixty. There is no duration picker. The overlay on
              the map is the same fifteen minutes as the copy.
            </p>
          </li>
          <li>
            <h2>Round-trip is the filter</h2>
            <p>
              Outbound minutes plus return minutes must be 15 or under. If the
              outbound would fit but the return would not, the place is omitted
              from the index. Food, shops, gym, grocery, GP, pharmacy, park, museum.
            </p>
          </li>
          <li>
            <h2>Journey and source on every result</h2>
            <p>
              Mode, legs, minutes — outbound and return as one loop. OpenStreetMap
              (ODbL) for the place, DTP GTFS Schedule for the trip, each with a
              date. This build is demonstration data, not a live GTFS extract.
            </p>
          </li>
        </ol>
        <Link className="cta" href="/map">
          Open the map
        </Link>
      </main>
    </div>
  );
}
