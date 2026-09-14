import type { Metadata } from "next";
import IncentivesClient from "./IncentivesClient";

/**
 * Iteration 2 page for /incentives.
 *
 * When someone clicks Incentives in the nav, Next.js opens this file.
 * It sets the browser tab title, then shows IncentivesClient
 * (that file has the real form and results).
 *
 * Related files:
 * - IncentivesClient.tsx (main UI to explain)
 * - incentives.module.css (styles)
 * - app/components/Chrome.tsx (nav link)
 */
export const metadata: Metadata = {
  title: "SERINEA Incentives",
  description:
    "Explore regional incentives and towns to consider from your job context and personal situation."
};

export default function Page() {
  return <IncentivesClient />;
}
