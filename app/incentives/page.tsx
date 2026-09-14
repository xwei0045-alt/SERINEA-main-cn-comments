import type { Metadata } from "next";
import IncentivesClient from "./IncentivesClient";

/**
 * ============================================================
 * FILE: page.tsx  →  URL /incentives
 * ============================================================
 * WHAT TO SAY IF ASKED:
 *   "This is the Iteration 2 page entry. Next.js opens this file
 *    when someone clicks Incentives in the nav. It only loads the
 *    real UI from IncentivesClient.tsx."
 *
 * WHY SO SHORT?
 *   Server page = metadata (browser tab title) + render the client UI.
 *   All buttons/forms live in IncentivesClient.tsx.
 *
 * RELATED FILES:
 *   - IncentivesClient.tsx  = the form and results (main thing to show)
 *   - incentives.module.css = the look / layout
 *   - ../components/Chrome.tsx = top nav link "Incentives"
 */
export const metadata: Metadata = {
  title: "SERINEA Incentives",
  description:
    "Explore regional incentives and towns to consider from your job context and personal situation."
};

export default function Page() {
  // Hands the page to the client component that owns the form.
  return <IncentivesClient />;
}
