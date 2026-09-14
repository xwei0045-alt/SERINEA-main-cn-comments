import type { Metadata } from "next";
import IncentivesClient from "./IncentivesClient";

/**
 * Iteration 2 route: /incentives
 *
 * COMES FROM: Chrome nav "Incentives" (after Compare).
 * LeanKit Epic 2: Occupation-Based Regional Incentives
 *   US2.1 Explore Occupation-Based Opportunities
 *   US2.2 Get AI-Assisted Incentive Guidance (also via /ai-assistant)
 *
 * Product intent: occupation / job context + incentives → best towns to consider.
 */
export const metadata: Metadata = {
  title: "SERINEA Incentives",
  description:
    "Explore regional incentives and towns to consider from your job context and personal situation."
};

export default function Page() {
  return <IncentivesClient />;
}
