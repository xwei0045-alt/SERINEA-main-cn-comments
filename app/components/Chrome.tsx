"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Current = "home" | "map" | "how";

export function Chrome({ current }: { current: Current }) {
  const [glass, setGlass] = useState(false);

  useEffect(() => {
    const onScroll = () => setGlass(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`mast${glass ? " mast--glass" : ""}`}>
      <Link href="/" className="wordmark">
        SERINEA
      </Link>
      <nav className="mast-nav" aria-label="Primary">
        <Link href="/" aria-current={current === "home" ? "page" : undefined}>
          Home
        </Link>
        <Link href="/map" aria-current={current === "map" ? "page" : undefined}>
          Map
        </Link>
        <Link href="/how" aria-current={current === "how" ? "page" : undefined}>
          How it works
        </Link>
      </nav>
    </header>
  );
}
