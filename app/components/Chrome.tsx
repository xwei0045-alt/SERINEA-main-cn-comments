import Link from "next/link";

/**
 * Site chrome (top mast).
 *
 * WHERE IT IS USED
 * - Home, Map, Compare, and AI Recommendation pages import <Chrome />.
 *
 * WHERE LINKS GO
 * - /map           → Iteration 1 reach map
 * - /compare       → Iteration 1 town ladder + preference ranking
 * - /ai-assistant  → Iteration 2 AI Recommendation (US2.2 incentive guidance)
 * - /              → marketing home
 *
 * Iteration 2 nav sits next to Compare so the product flow is Map → Compare → AI Recommendation.
 */
type Current = "home" | "map" | "compare" | "assistant";

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
        <Link
          href="/ai-assistant"
          aria-current={current === "assistant" ? "page" : undefined}
        >
          AI Recommendation
        </Link>
      </nav>
      <Link href="/" className="wordmark" aria-current={current === "home" ? "page" : undefined}>
        SERINEA
      </Link>
      <div className="mast-side mast-side--end" aria-hidden="true" />
    </header>
  );
}
