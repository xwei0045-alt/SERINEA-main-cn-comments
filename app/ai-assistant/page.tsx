import type { Metadata } from "next";
import AssistantClient from "./AssistantClient";

export const metadata: Metadata = {
  title: "SERINEA AI Recommendation",
  description:
    "Find regional towns to consider using lifestyle preferences, personal circumstances and mock relocation incentives."
};

export default function Page() {
  return <AssistantClient />;
}
