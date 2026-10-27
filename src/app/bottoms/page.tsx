import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Allmoxy bottoms · DBS Operations Hub",
  description: "Opens the standalone Allmoxy bottoms app.",
};

export default function BottomsPage() {
  redirect("https://allmoxy-bottoms.vercel.app");
}
