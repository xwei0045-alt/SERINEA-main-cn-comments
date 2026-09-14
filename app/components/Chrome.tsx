import Link from "next/link";

/**
 * Site chrome (top mast).
 *
 * WHERE IT IS USED
 * - Home, Map, Compare, Incentives, and AI Recommendation pages import <Chrome />.
 *
 * WHERE LINKS GO
 * - /map           → Iteration 1 reach map
 * - /compare       → Iteration 1 town ladder + preference ranking
 * - /incentives    → Iteration 2 occupation / incentives → towns
 * - /ai-assistant  → AI Recommendation (right side)
 * - /              → marketing home
 *
 * Layout: Map · Compare · Incentives | SERINEA | AI Recommendation
 */
type Current = "home" | "map" | "compare" | "incentives" | "assistant";

type Props = {
  current: Current;
  floating?: boolean;
};

export function Chrome({ current, floating = false }: Props) {
  return (
    <header className={floating ? "mast mast--editorial mast--float" : "mast mast--editorial"}>
      <nav className="mast-side" aria-label="Primary">
        <Link href="/map" aria-current={current === "map" ? "page" : undefined}>
          Map
        </Link>
        <Link href="/compare" aria-current={current === "compare" ? "page" : undefined}>
          Compare
        </Link>
        <Link href="/incentives" aria-current={current === "incentives" ? "page" : undefined}>
          Incentives
        </Link>
      </nav>
      <Link href="/" className="wordmark" aria-current={current === "home" ? "page" : undefined}>
        SERINEA
      </Link>
      <nav className="mast-side mast-side--end" aria-label="Assistant">
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
