import Link from "next/link";
import { Chrome } from "../components/Chrome";

export const metadata = {
  title: "How it works — SERINEA",
  description: "Drop a pin in regional Victoria. Fifteen minutes there and back."
};

export default function HowPage() {
  return (
    <div className="how">
      <Chrome current="how" />
      <main id="content">
        <h1>How to read the 15 minute map</h1>
        <p className="lead">
          One pin. Fifteen minutes there and back on foot. Only places you can
          reach and still get home from are listed.
        </p>
        <ul className="read-key" aria-label="How to read the map">
          <li>
            <span className="key-overlay" aria-hidden="true" />
            Orange area — a 15-minute walk there and back (straight line)
          </li>
          <li>
            <span className="poi-mark poi-mark--park" aria-hidden="true">
              P
            </span>
            Letter on a square — park, grocery, doctor, pharmacy or gym
          </li>
          <li>
            <span className="key-pin" aria-hidden="true" />
            Red square — the start. Drag it, or click the map to move.
          </li>
        </ul>
        <ol>
          <li>
            <h2>Start in a regional town</h2>
            <p>
              The map opens on Shepparton. Search a town, tap a shortcut, click
              the map, or use your location. Inner Melbourne is not in this
              extract.
            </p>
          </li>
          <li>
            <h2>The window is fifteen minutes</h2>
            <p>
              Not thirty. Not sixty. There is no duration picker. The orange
              area on the map is the same fifteen minutes as the list.
            </p>
          </li>
          <li>
            <h2>Round-trip is the filter</h2>
            <p>
              Time there plus time back must be 15 minutes or under. If you
              could walk there but not get back in time, the place is left off
              the list. This pass shows parks, groceries, doctors, pharmacies
              and gyms.
            </p>
          </li>
          <li>
            <h2>Follow the street path</h2>
            <p>
              Pick a place. The orange line is the walking route along streets,
              not the straight-line circle. Start walk to see time remaining.
              If you are near the pin, your phone location updates the time as
              you go. At the place, walk back the same way.
            </p>
          </li>
          <li>
            <h2>Times are walking estimates</h2>
            <p>
              The list uses a straight-line 15-minute search. After you pick a
              place, minutes follow the street path at a walking pace. They are
              not bus or train times.
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
