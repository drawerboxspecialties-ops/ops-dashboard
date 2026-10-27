import type { Metadata } from "next";
import { Trimmer } from "@/components/bottoms/trimmer";

export const metadata: Metadata = {
  title: "Allmoxy bottoms · DBS Operations Hub",
  description: "Remove orders from an Allmoxy bottoms CSV and save today's file to the Desktop.",
};

export default function BottomsPage() {
  return <Trimmer />;
}
