"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { TownSearchField } from "@/app/components/TownSearchField";
import { COMPARE_PREFERENCES, TOWN_JUMPS } from "@/lib/types";
import { findPreferences } from "@/lib/preferenceSearch";
import styles from "./homeDesk.module.css";

type Mode = "town" | "need";

const TOWNS = [
  {
    name: "Shepparton",
    blurb: "Our default pin, dense enough to show a full fifteen-minute walk.",
    lat: -36.378248,
    lng: 145.40295
  },
  {
    name: "Bendigo",
    blurb: "Goldfields centre with parks, schools and clinics in walking range.",
    lat: -36.75787,
    lng: 144.281138
  },
  {
    name: "Mildura",
    blurb: "River town. Prove the window still holds when the grid thins out.",
    lat: -34.195496,
    lng: 142.146155
  },
  {
    name: "Wodonga",
    blurb: "Border regional city. Compare what fits a fifteen-minute walk.",
    lat: -36.131367,
    lng: 146.883574
  }
] as const;

/** Editorial pastoral home — SERINGA-style scroll, SERINEA product truth. */
export function LandingExperience() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("town");
  const [town, setTown] = useState("");
  const [prefs, setPrefs] = useState<string[]>([]);
  const [prefQuery, setPrefQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const prefHits = useMemo(
    () => findPreferences(prefQuery, prefs),
    [prefQuery, prefs]
  );

  function togglePref(id: string) {
    setPrefs((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function onPriorityGo() {
    if (prefs.length === 0) {
      setError("Pick at least one facility.");
      return;
    }
    router.push(`/compare?${new URLSearchParams({ prefs: prefs.join(",") })}`);
  }

  return (
    <div className={styles.journal}>
      <section className={styles.hero} aria-label="SERINEA">
        {/* User assets: Images/desk1.webp (laptop) · Images/mobile1.webp (phone) */}
        <Image
          src="/images/mobile1.webp"
          alt=""
          fill
          priority
          className={`${styles.heroImg} ${styles.heroImgMobile}`}
          sizes="100vw"
        />
        <Image
          src="/images/desk1.webp"
          alt=""
          fill
          priority
          className={`${styles.heroImg} ${styles.heroImgDesktop}`}
          sizes="100vw"
        />
        <div className={styles.heroWash} aria-hidden="true" />
        <div className={styles.heroPlate}>
          <p className={styles.heroBrand}>SERINEA</p>
          <p className={styles.heroTag}>Life beyond the city limits</p>
        </div>
        <a className={styles.pill} href="#begin">
          Explore
        </a>
      </section>

      <section className={styles.mist} aria-label="The fifteen-minute promise">
        <p className={styles.mistQuote}>
          Drop a pin and see what you can walk to from there: parks, shops,
          clinics and more inside a fixed fifteen-minute walk.
        </p>
        <figure className={styles.mistMat}>
          <div className={styles.mistFrame}>
            <Image
              src="/editorial/victoria.png"
              alt="Regional Victoria harbour town"
              width={900}
              height={720}
              className={styles.mistPhoto}
            />
            <figcaption className={styles.mistCaption}>Fifteen minutes.</figcaption>
          </div>
        </figure>
        <Link className={styles.mistBar} href="/map">
          What can you reach on foot?
        </Link>
      </section>

      <section className={styles.case} aria-labelledby="case-heading">
        <h2 id="case-heading">Why regional liveability needs better evidence</h2>
        <p className={styles.caseLead}>
          Choosing a regional town involves more than comparing property prices.
          Housing, healthcare, shops, parks and other everyday services vary between
          locations, while the information needed to compare them is often scattered.
          A service’s presence also doesn’t guarantee it’s conveniently accessible
          from where a person lives.
        </p>

        <h3 className={styles.caseSub}>What SERINEA does</h3>
        <ul className={styles.caseList}>
          <li>
            <strong>Bring data together.</strong>             Open location data on parks, shops
            and clinics, in one place for regional Victoria.
          </li>
          <li>
            <strong>Relate it to a 15-minute walk.</strong> Show what may be
            reachable from a chosen point on foot, with the window fixed.
          </li>
          <li>
            <strong>Support comparison.</strong> Help weigh trade-offs across
            localities when the same budget buys a different everyday life.
          </li>
        </ul>

        <p className={styles.caseFigure}>
          Regional Victoria’s median house price is{" "}
          <strong>A$636,500</strong>, but what that budget buys varies
          significantly between towns.
        </p>
        <p className={styles.caseSdg}>
          Connects to UN SDG 11: sustainable cities. Housing, services and public
          space made easier to understand.
        </p>
        <p className={styles.caseSource}>
          Sources: ABC News (REIV figures, reported Nov 2025) · Victorian Government
          Planning · United Nations Sustainable Development Goal 11
        </p>
      </section>

      <section className={styles.breath} aria-label="Slower living">
        <div className={styles.breathWash} aria-hidden="true" />
        <p className={styles.breathLine}>
          Less time commuting, more time living. Less noise, more headspace.
        </p>
        <a className={styles.breathBar} href="#begin">
          Could slower be better?
        </a>
      </section>

      <section className={styles.forest}>
        <p className={styles.forestEyeline}>Regional Victoria</p>
        <h2 className={styles.forestTitle}>See what a pin can reach</h2>
        <figure className={styles.engraving}>
          <Image
            src="/editorial/victoria.png"
            alt="Archival-style view of a Victorian regional harbour town"
            width={1200}
            height={675}
            className={styles.engravingImg}
          />
          <figcaption>
            <span>Come explore regional Victoria</span>
          </figcaption>
        </figure>
        <div className={styles.townGrid}>
          {TOWNS.map((item) => (
            <article key={item.name}>
              <h3>{item.name}</h3>
              <p>{item.blurb}</p>
              <Link
                href={`/map?lat=${item.lat}&lng=${item.lng}&town=${encodeURIComponent(item.name)}`}
              >
                Open map
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.tableSec}>
        <h2>Why this is different</h2>
        <div className={styles.table} role="table" aria-label="Nearby apps versus SERINEA">
          <div className={styles.tr} role="row">
            <span role="columnheader" />
            <span role="columnheader">Typical nearby map</span>
            <span role="columnheader">SERINEA</span>
          </div>
          <div className={styles.tr} role="row">
            <span role="rowheader">Travel window</span>
            <span>Often 5 to 60 minutes, adjustable</span>
            <span>Fixed fifteen-minute walk from your pin</span>
          </div>
          <div className={styles.tr} role="row">
            <span role="rowheader">Focus</span>
            <span>Often CBD-first or vague “nearby”</span>
            <span>What you can walk to from here</span>
          </div>
          <div className={styles.tr} role="row">
            <span role="rowheader">Coverage</span>
            <span>Often CBD-first</span>
            <span>Regional Victoria extract</span>
          </div>
          <div className={styles.tr} role="row">
            <span role="rowheader">Times</span>
            <span>May imply live transit</span>
            <span>Walking estimates, labelled clearly</span>
          </div>
        </div>
      </section>

      <section className={styles.begin} id="begin">
        <h2>Begin</h2>
        <p className={styles.beginLead}>
          Name a town, or choose what must be nearby, then we take you to the map
          or the town ladder.
        </p>
        <div className={styles.switch} role="tablist" aria-label="Begin">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "town"}
            className={mode === "town" ? styles.switchOn : styles.switchOff}
            onClick={() => {
              setMode("town");
              setError(null);
            }}
          >
            I know the town
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "need"}
            className={mode === "need" ? styles.switchOn : styles.switchOff}
            onClick={() => {
              setMode("need");
              setError(null);
            }}
          >
            I know what I need
          </button>
        </div>

        {mode === "town" ? (
          <div className={styles.beginForm}>
            <TownSearchField
              id="home-town"
              label="Town or LGA"
              value={town}
              onValueChange={(value) => {
                setTown(value);
                setError(null);
              }}
              placeholder="Shepparton, Mildura, Bendigo…"
              onSelect={(item) => {
                if (item.latitude == null || item.longitude == null) {
                  setError("That town has no map pin in the extract.");
                  return;
                }
                setTown(item.locality);
                router.push(
                  `/map?${new URLSearchParams({
                    lat: String(item.latitude),
                    lng: String(item.longitude),
                    town: item.locality
                  })}`
                );
              }}
            />
            <div className={styles.quickTowns}>
              {TOWN_JUMPS.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() =>
                    router.push(
                      `/map?lat=${t.lat}&lng=${t.lng}&town=${encodeURIComponent(t.label)}`
                    )
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.beginForm}>
            <input
              className={styles.prefSearch}
              value={prefQuery}
              onChange={(event) => setPrefQuery(event.target.value)}
              placeholder="Filter facilities: bus, school, pharmacy…"
              aria-label="Filter facilities"
              autoComplete="off"
            />
            <div className={styles.mosaic} role="group" aria-label="Facilities">
              {(prefQuery.trim() ? prefHits : COMPARE_PREFERENCES).map((pref) => {
                const on = prefs.includes(pref.id);
                return (
                  <button
                    key={pref.id}
                    type="button"
                    className={on ? styles.tileOn : styles.tile}
                    aria-pressed={on}
                    onClick={() => togglePref(pref.id)}
                  >
                    {pref.label}
                  </button>
                );
              })}
            </div>
            <div className={styles.beginActions}>
              <span>
                {prefs.length === 0 ? "Nothing selected" : `${prefs.length} selected`}
              </span>
              <button type="button" className={styles.pillDark} onClick={onPriorityGo}>
                Rank towns
              </button>
            </div>
          </div>
        )}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </section>

      <footer className={styles.foot}>
        <div>
          <p className={styles.footBrand}>SERINEA</p>
          <p>
            Team SERINEA · TP06 · FIT5120. Regional reach without the marketing fluff.
          </p>
        </div>
        <div className={styles.footLinks}>
          <Link href="/map">Map</Link>
          <Link href="/compare">Compare</Link>
          <Link href="/story">Previous home</Link>
        </div>
      </footer>
    </div>
  );
}
