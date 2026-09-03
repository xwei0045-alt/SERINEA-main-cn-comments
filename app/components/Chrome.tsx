"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Current = "home" | "map" | "how";

export function Chrome({ current }: { current: Current }) {
  const [glass, setGlass] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setGlass(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header className={`mast${glass ? " mast--glass" : ""}${menuOpen ? " mast--open" : ""}`}>
      <Link href="/" className="wordmark" onClick={() => setMenuOpen(false)}>
        SERINEA
      </Link>
      <button
        type="button"
        className="mast-burger"
        aria-expanded={menuOpen}
        aria-controls="site-menu"
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        onClick={() => setMenuOpen((v) => !v)}
      >
        <span className="mast-burger-lines" aria-hidden="true" />
      </button>
      <nav
        id="site-menu"
        className="mast-nav"
        aria-label="Primary"
        data-open={menuOpen ? "true" : "false"}
      >
        <Link
          href="/"
          aria-current={current === "home" ? "page" : undefined}
          onClick={() => setMenuOpen(false)}
        >
          Home
        </Link>
        <Link
          href="/map"
          aria-current={current === "map" ? "page" : undefined}
          onClick={() => setMenuOpen(false)}
        >
          Map
        </Link>
        <Link
          href="/how"
          aria-current={current === "how" ? "page" : undefined}
          onClick={() => setMenuOpen(false)}
        >
          How it works
        </Link>
      </nav>
      {menuOpen ? (
        <button
          type="button"
          className="mast-scrim"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
    </header>
  );
}
