"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "./homeDesk.module.css";

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
          src="/images/geelong.jpg"
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
        <Link className={styles.pill} href="/map">
          Explore
        </Link>
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
        <h2 id="case-heading">Why this matters</h2>
        <p className={styles.caseLead}>
          Regional services are scattered and hard to compare. SERINEA brings parks,
          shops and clinics into one place, shows what a fifteen-minute walk can
          reach, and helps weigh towns against each other.
        </p>
        <p className={styles.caseFigure}>
          Regional Victoria’s median house price is <strong>A$636,500</strong>.
          What that budget buys still varies by town.
        </p>
        <p className={styles.caseSource}>
          Source: ABC News, REIV figures, Nov 2025 · UN SDG 11
        </p>
      </section>

      <section className={styles.breath} aria-label="Slower living">
        <div className={styles.breathWash} aria-hidden="true" />
        <p className={styles.breathLine}>
          Less time commuting, more time living. Less noise, more headspace.
        </p>
        <Link className={styles.breathBar} href="/map">
          Could slower be better?
        </Link>
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
