import type { Metadata } from "next";
import AssistantClient from "./AssistantClient";

/**
 * Iteration 2 route: /ai-assistant
 *
 * COMES FROM: Chrome nav link "AI Recommendation" (far right of the mast).
 * GOES TO: AssistantClient (client UI) which calls:
 *   1) lib/recommendationAssistant → structured preferences from the user message
 *   2) GET /api/compare → lifestyle town ranking (CompareService — same as Compare page)
 *   3) POST /api/incentives → mock subsidy screening (IncentiveService)
 *
 * LeanKit: US2.2 Get AI-Assisted Incentive Guidance (+ AC2.2.1–AC2.2.3).
 * This route assembles an incentive request but does not alter town ranking.
 */
export const metadata: Metadata = {
  title: "SERINEA AI Recommendation",
  description:
    "Find regional towns to consider using lifestyle preferences, personal circumstances and mock relocation incentives."
};

export default function Page() {
  return <AssistantClient />;
}
