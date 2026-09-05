"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent
} from "react";
import { DEMO_PINS } from "../../../lib/landingDemo";
import { FACTS, PHASES } from "../../../lib/landingStory";
import styles from "./landing.scroll.module.css";

function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function smooth(a: number, b: number, x: number) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
/** Dot flight YOU → pin. */
function softTravel(p: number, start: number) {
  return smooth(start, start + 0.07, p);
}
/** Line draw after a pin has landed. */
function softDraw(p: number, start: number) {
  return smooth(start, start + 0.055, p);
}
function softKill(p: number) {
  // Ghost outbound-only places, then everything retracts into YOU
  return smooth(0.52, 0.555, p);
}

/** Shared per-pin choreography: expand out, hold, then ease back into YOU. */
function pinTiming(i: number) {
  const travelStart = 0.3 + i * 0.0025;
  const drawStart = 0.39 + i * 0.0025;
  // Retract outer pins first so the collapse reads inward
  const retractStart = 0.555 + (14 - i) * 0.002;
  return { travelStart, drawStart, retractStart };
}

function pinMotion(p: number, i: number) {
  const { travelStart, drawStart, retractStart } = pinTiming(i);
  const travelOut = softTravel(p, travelStart);
  const drawOut = softDraw(p, drawStart);
  const retract = smooth(retractStart, retractStart + 0.065, p);
  // Net reach from YOU (1 = at pin, 0 = back inside YOU)
  const reach = travelOut * (1 - retract);
  const draw = drawOut * (1 - retract);
  // Labels leave before the collapse so they don’t jump
  const labelHold = smooth(0.88, 1, drawOut);
  const labelOut = 1 - smooth(0.535, 0.56, p);
  const labelOn = labelHold * labelOut * (1 - retract);
  return { travelStart, reach, draw, labelOn, retract, drawn: drawOut >= 0.98 && retract < 0.02 };
}

/** Spoke starts just outside YOU so lines don’t pile on one pixel. */
function spokeOrigin(x: number, y: number, clear = 3.4) {
  const dx = x - 50;
  const dy = y - 50;
  const len = Math.hypot(dx, dy) || 1;
  return { x1: 50 + (dx / len) * clear, y1: 50 + (dy / len) * clear };
}

/** One fact card at a time — full opacity, soft crossfade, no ghost stack. */
function factCardAmt(p: number, i: number) {
  const windows: [number, number, number, number][] = [
    [0.922, 0.934, 0.938, 0.948],
    [0.942, 0.952, 0.956, 0.966],
    [0.960, 0.968, 0.972, 0.982]
  ];
  const [a, b, c, d] = windows[i] ?? windows[0];
  return smooth(a, b, p) * (1 - smooth(c, d, p));
}

const MINUTES = Array.from({ length: 15 }, (_, i) => i + 1);

export function LandingScroll() {
  const trackRef = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const targetP = useRef(0);
  const smoothP = useRef(0);
  const [p, setP] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [mx, setMx] = useState(0.5);
  const [my, setMy] = useState(0.5);

  const readTarget = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const range = Math.max(1, el.offsetHeight - window.innerHeight);
    targetP.current = clamp(-rect.top / range, 0, 1);
  }, []);

  useEffect(() => {
    const off = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduced(off);
    const mq = window.matchMedia("(max-width: 900px)");
    const syncNarrow = () => setNarrow(mq.matches);
    syncNarrow();
    mq.addEventListener("change", syncNarrow);
    if (off) {
      setP(1);
      targetP.current = 1;
      smoothP.current = 1;
      return () => mq.removeEventListener("change", syncNarrow);
    }

    let running = true;
    const damp = 0.07; // silkier scroll follow

    const frame = () => {
      if (!running) return;
      readTarget();
      const cur = smoothP.current;
      const tgt = targetP.current;
      const next = cur + (tgt - cur) * damp;
      // Snap when nearly there so we don't crawl forever
      smoothP.current = Math.abs(tgt - next) < 0.00012 ? tgt : next;
      if (Math.abs(smoothP.current - cur) > 0.00003) {
        setP(smoothP.current);
      }
      raf.current = requestAnimationFrame(frame);
    };

    readTarget();
    smoothP.current = targetP.current;
    setP(targetP.current);
    raf.current = requestAnimationFrame(frame);

    window.addEventListener("scroll", readTarget, { passive: true });
    window.addEventListener("resize", readTarget);
    return () => {
      running = false;
      cancelAnimationFrame(raf.current);
      window.removeEventListener("scroll", readTarget);
      window.removeEventListener("resize", readTarget);
      mq.removeEventListener("change", syncNarrow);
    };
  }, [readTarget]);

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (reduced) return;
    const r = e.currentTarget.getBoundingClientRect();
    setMx((e.clientX - r.left) / r.width);
    setMy((e.clientY - r.top) / r.height);
  };

  const name = 1 - smooth(0, 0.09, p);
  const lie = smooth(0.06, 0.14, p) * (1 - smooth(0.16, 0.24, p));
  const cut = smooth(0.14, 0.24, p) * (1 - smooth(0.28, 0.36, p));
  // Soft handoff: atlas finishes retract, then chapters crossfade (no hard cuts)
  const atlas = smooth(0.24, 0.34, p) * (1 - smooth(0.58, 0.68, p));
  const orbit = atlas;
  const filterAmt = smooth(0.52, 0.58, p);
  const crew = 0;
  const lock = smooth(0.66, 0.74, p) * (1 - smooth(0.78, 0.84, p));
  const phaseAmt = smooth(0.8, 0.86, p) * (1 - smooth(0.9, 0.93, p));
  // Fact plate lives long enough for all 3 cards, one at a time
  const factAmt = smooth(0.91, 0.935, p) * (1 - smooth(0.972, 0.988, p));
  const go = smooth(0.975, 1, p);
  const invert = 0;

  const fifteenCount = Math.max(1, Math.round(lerp(1, 15, clamp(cut / 0.85, 0, 1))));
  const fifteenScale = lerp(0.55, 1.02, Math.min(1, cut));
  const spin = narrow ? atlas * 4 : atlas * 8 + filterAmt * 4;
  const warp = narrow ? 0 : filterAmt * 1.5;
  const brandSpread = lerp(0, 1, name);
  const atlasGlow = atlas > 0.9 && filterAmt < 0.08 && p >= 0.46 && p < 0.53;

  const pins = useMemo(() => DEMO_PINS, []);
  // Phones: fewer labelled dots so the atlas stays readable
  const showLabel = useCallback(
    (i: number, keep: boolean) => {
      if (!narrow) return true;
      if (!keep) return false;
      return i % 2 === 0;
    },
    [narrow]
  );
  const showGo = reduced || go > 0.02;

  return (
    <div
      ref={trackRef}
      className={`${styles.reel}${reduced ? ` ${styles.reelStatic}` : ""}`}
      style={
        {
          ["--p"]: p,
          ["--name"]: name,
          ["--lie"]: lie,
          ["--cut"]: cut,
          ["--orbit"]: orbit,
          ["--atlas"]: atlas,
          ["--filter"]: filterAmt,
          ["--crew"]: crew,
          ["--lock"]: lock,
          ["--phase"]: phaseAmt,
          ["--fact"]: factAmt,
          ["--go"]: go,
          ["--invert"]: invert,
          ["--mx"]: mx,
          ["--my"]: my,
          ["--spin"]: `${spin}deg`,
          ["--fifteen"]: fifteenScale,
          ["--warp"]: `${warp}px`,
          ["--spread"]: brandSpread
        } as CSSProperties
      }
    >
      <div className={styles.sticky} onPointerMove={onMove}>
        <div className={styles.stage} aria-label="Scroll-driven SERINEA experience">
          <h1 className={styles.srOnly}>
            SERINEA: fifteen-minute round-trip reach for regional Victoria
          </h1>
          <div className={styles.noise} aria-hidden="true" />
          <div className={styles.gridDrift} aria-hidden="true" />
          <div className={styles.scan} aria-hidden="true" />
          <div className={styles.vignette} aria-hidden="true" />

          <div className={styles.brandPlate} aria-hidden={name < 0.08}>
            <p className={styles.brandStamp} data-text="SERINEA">
              SERINEA
            </p>
            <p className={styles.brandTag}>
              Reach that works in regional Victoria
            </p>
          </div>
          <p
            className={styles.brandHint}
            aria-hidden={name < 0.08}
            style={{ opacity: name }}
          >
            Scroll ↓
          </p>

          <p className={styles.lieStamp} aria-hidden={lie < 0.1} data-text="NEARBY">
            NEARBY
          </p>

          <div
            className={styles.fifteenWrap}
            aria-hidden={cut < 0.05}
            style={{ opacity: cut * (1 - atlas * 0.95) }}
          >
            <div className={styles.minuteRing} aria-hidden="true">
              {MINUTES.map((m) => {
                const on = m <= fifteenCount;
                const ang = ((m - 1) / 15) * 360 - 90;
                return (
                  <span
                    key={m}
                    className={`${styles.minuteTick}${on ? ` ${styles.minuteTickOn}` : ""}`}
                    style={
                      {
                        transform: `rotate(${ang}deg) translateY(-42%)`,
                        opacity: on ? 1 : 0.12
                      } as CSSProperties
                    }
                  >
                    <i>{m}</i>
                  </span>
                );
              })}
            </div>
            <p className={styles.fifteenGhost} aria-hidden="true">
              {fifteenCount}
            </p>
            <p className={styles.fifteen} aria-live="polite">
              {fifteenCount}
            </p>
            <p className={styles.fifteenUnit}>min round-trip</p>
            <div className={styles.ring} />
            <div className={styles.ringInner} />
          </div>

          <div
            className={`${styles.atlasPlate}${atlasGlow ? ` ${styles.atlasPlateGlow}` : ""}`}
            aria-hidden={atlas < 0.04}
            style={{ opacity: atlas }}
            data-pins={pins.length}
          >
            <div className={styles.atlasGlow} aria-hidden="true" />
            <svg
              className={styles.atlasSpokes}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {pins.map((pin, i) => {
                const kill = !pin.keep ? softKill(p) : 0;
                const live = 1 - kill;
                const { reach, draw, drawn } = pinMotion(p, i);
                const endX = lerp(50, pin.x, reach);
                const endY = lerp(50, pin.y, reach);
                const { x1, y1 } = spokeOrigin(endX, endY, lerp(0.6, 3.4, reach));
                return (
                  <line
                    key={`spoke-${pin.id}`}
                    className={`${styles.atlasSpoke}${
                      atlasGlow && drawn ? ` ${styles.atlasSpokeGlow}` : ""
                    }`}
                    pathLength={1}
                    x1={x1}
                    y1={y1}
                    x2={endX}
                    y2={endY}
                    style={
                      {
                        opacity:
                          atlas *
                          live *
                          (draw > 0.02 ? 1 : 0) *
                          (reach > 0.04 ? 1 : 0),
                        strokeDasharray: drawn && atlasGlow ? "0.1 0.18" : 1,
                        strokeDashoffset: drawn && atlasGlow ? undefined : 1 - draw,
                        animationDelay: `${i * 0.07}s`
                      } as CSSProperties
                    }
                  />
                );
              })}
            </svg>
            <p
              className={`${styles.atlasYou}${atlasGlow ? ` ${styles.atlasYouGlow}` : ""}`}
            >
              You
            </p>
            <div className={styles.atlasPins}>
              {pins.map((pin, i) => {
                const kill = !pin.keep ? softKill(p) : 0;
                const live = 1 - kill;
                const { travelStart, reach, labelOn } = pinMotion(p, i);
                const left = lerp(50, pin.x, reach);
                const top = lerp(50, pin.y, reach);
                const labelLeft = pin.x < 50;
                return (
                  <span
                    key={pin.id}
                    className={`${styles.atlasPin}${kill > 0.4 ? ` ${styles.atlasPinDead}` : ""}`}
                    style={
                      {
                        left: `${left}%`,
                        top: `${top}%`,
                        opacity:
                          atlas *
                          smooth(travelStart - 0.015, travelStart + 0.02, p) *
                          (0.45 + 0.55 * live) *
                          (reach > 0.03 ? 1 : lerp(0, 1, reach / 0.03)),
                        transform: `translate(-50%, -50%) scale(${
                          lerp(0.25, 1, reach) * lerp(1, 0.55, kill)
                        })`,
                        zIndex: kill > 0.5 ? 1 : 2 + i
                      } as CSSProperties
                    }
                    title={`${pin.label} · ${pin.kind} · ${pin.minutes}′ demo`}
                  >
                    <span className={styles.atlasDot} />
                    <em
                      className={`${styles.atlasLabel}${labelLeft ? ` ${styles.atlasLabelLeft}` : ""}`}
                      style={{
                        opacity: showLabel(i, pin.keep)
                          ? labelOn * lerp(1, 0.2, kill)
                          : 0,
                        transform: `translateY(${lerp(8, 0, labelOn)}px)`
                      }}
                    >
                      <b>{pin.label}</b>
                      <span>{pin.minutes}′</span>
                    </em>
                  </span>
                );
              })}
            </div>
          </div>

          <div
            className={styles.lockPlate}
            aria-hidden={lock < 0.05}
            style={
              {
                opacity: lock,
                transform: `translate(-50%, -50%) scale(${lerp(0.94, 1, lock)}) translateY(${lerp(16, 0, lock)}px)`
              } as CSSProperties
            }
          >
            <p className={styles.lockStamp} data-text="SECURE">
              SECURE
            </p>
            <ul className={styles.lockList}>
              <li>No accounts this pass</li>
              <li>Your pin is for reach, not a profile</li>
              <li>Walking times labelled as estimates</li>
            </ul>
          </div>

          <div
            className={styles.phaseStack}
            aria-hidden={phaseAmt < 0.05}
            style={
              {
                opacity: phaseAmt,
                transform: `translate(-50%, -50%) scale(${lerp(0.96, 1, phaseAmt)}) translateY(${lerp(14, 0, phaseAmt)}px)`
              } as CSSProperties
            }
          >
            <p className={styles.phaseLead}>What we are solving</p>
            <p className={styles.phaseIntro}>
              For people in regional and rural towns who rely on walking, not
              drivers, and not city apps that pretend every place is “nearby.”
            </p>
            <div className={styles.phasePlate}>
              {PHASES.map((ph) => (
                <p key={ph.id} className={styles.phaseFact}>
                  <span>{ph.title.replace(/[“”"]/g, "")}</span>
                  {ph.body}
                </p>
              ))}
            </div>
          </div>

          <div
            className={styles.factPlate}
            aria-hidden={factAmt < 0.05}
            style={
              {
                opacity: factAmt,
                transform: `translate(-50%, -50%) scale(${lerp(0.96, 1, factAmt)})`
              } as CSSProperties
            }
          >
            {FACTS.map((f, i) => {
              const card = factCardAmt(p, i);
              return (
                <p
                  key={f.id}
                  className={`${styles.factLine}${card > 0.55 ? ` ${styles.factOn}` : ""}`}
                  style={{
                    opacity: card,
                    transform: `translateY(${lerp(16, 0, card)}px) scale(${lerp(0.97, 1, card)})`,
                    zIndex: Math.round(card * 10)
                  }}
                  aria-hidden={card < 0.08}
                >
                  <span>{f.kicker}</span>
                  {f.line}
                </p>
              );
            })}
          </div>

          {showGo ? (
            <div
              className={styles.goPlate}
              aria-hidden={go < 0.05 && !reduced}
              style={
                {
                  opacity: reduced ? 1 : go,
                  transform: `translate(-50%, -50%) scale(${lerp(0.96, 1, go)}) translateY(${lerp(18, 0, go)}px)`,
                  pointerEvents: go > 0.4 || reduced ? "auto" : "none"
                } as CSSProperties
              }
            >
              <p className={styles.goTitle}>We've got your town's back.</p>
              <p className={styles.goBody}>
                Drop a pin in regional Victoria. Keep only what you can walk to and
                back from in fifteen minutes.
              </p>
              <div className={styles.actions}>
                <Link className={styles.cta} href="/map">
                  Open the map
                </Link>
                <Link className={styles.ctaGhost} href="/how">
                  How it works
                </Link>
              </div>
              <p className={styles.goNote}>
                Opens on Shepparton. Walking estimates from OpenStreetMap, not public transport times yet.
              </p>
            </div>
          ) : null}

          <div className={styles.flash} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
