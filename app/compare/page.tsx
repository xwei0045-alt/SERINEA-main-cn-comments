import type { Metadata } from "next";
import CompareClient from "./CompareClient";

export const metadata: Metadata = {
  title: "Compare - SERINEA",
  description:
    "Choose what matters nearby. Rank regional Victoria localities and see the strongest fit for your move."
};

export default function Page() {
  return <CompareClient />;
}
