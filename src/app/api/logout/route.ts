import { NextResponse } from "next/server";
import { clearHubCookies } from "@/lib/hub-auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  clearHubCookies(response);
  return response;
}
