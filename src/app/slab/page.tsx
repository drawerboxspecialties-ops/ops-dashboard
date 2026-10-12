import type { Metadata } from "next";
import { SlabEstimator } from "@/components/slab/estimator";

export const metadata: Metadata = {
  title: "Slab Measure · DBS Operations Hub",
  description: "Read a door schedule and price slab doors and drawer fronts from the October 2026 list.",
};

export default function SlabPage() {
  return <SlabEstimator />;
}
