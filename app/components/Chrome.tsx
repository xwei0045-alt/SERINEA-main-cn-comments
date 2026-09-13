import Link from "next/link";

type Current = "home" | "map" | "compare" | "assistant";

type Props = {
  current: Current;
  floating?: boolean;
};

/** Centered editorial mast — wordmark in the middle, links either side. */
export function Chrome({ current, floating = false }: Props) {
  return (
    <header className={floating ? "mast mast--editorial mast--float" : "mast mast--editorial"}>
      <nav className="mast-side" aria-label="Primary left">
        <Link href="/map" aria-current={current === "map" ? "page" : undefined}>
          Map
        </Link>
        <Link href="/compare" aria-current={current === "compare" ? "page" : undefined}>
          Compare
        </Link>
      </nav>
      <Link href="/" className="wordmark" aria-current={current === "home" ? "page" : undefined}>
        SERINEA
      </Link>
      <nav className="mast-side mast-side--end" aria-label="AI Recommendation">
        <Link
          href="/ai-assistant"
          aria-current={current === "assistant" ? "page" : undefined}
        >
          AI Recommendation
        </Link>
      </nav>
    </header>
  );
}
