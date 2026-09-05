import Link from "next/link";

type Current = "home" | "map" | "how" | "compare";

/** Flat header with always-visible links — no hamburger. */
export function Chrome({ current }: { current: Current }) {
  return (
    <header className="mast">
      <Link href="/" className="wordmark">
        SERINEA
      </Link>
      <nav id="site-menu" className="mast-nav" aria-label="Primary">
        <Link href="/" aria-current={current === "home" ? "page" : undefined}>
          Home
        </Link>
        <Link href="/map" aria-current={current === "map" ? "page" : undefined}>
          Map
        </Link>
        <Link
          href="/compare"
          aria-current={current === "compare" ? "page" : undefined}
        >
          Compare
        </Link>
        <Link href="/how" aria-current={current === "how" ? "page" : undefined}>
          How it works
        </Link>
      </nav>
    </header>
  );
}
