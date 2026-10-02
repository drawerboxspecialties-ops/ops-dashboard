import { NextResponse, type NextRequest } from "next/server";
import { HUB_COOKIE, hubAuthEnabled, hubCookieIsValid } from "@/lib/hub-auth";

function isPublic(pathname: string) {
  return pathname === "/login" || pathname === "/api/login" || pathname === "/api/logout";
}

function withNoStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname)) return withNoStore(NextResponse.next());
  if (!hubAuthEnabled()) {
    if (process.env.NODE_ENV !== "production") return withNoStore(NextResponse.next());
    if (pathname.startsWith("/api/")) {
      return withNoStore(NextResponse.json({ error: "Hub password is not configured." }, { status: 401 }));
    }
    return withNoStore(NextResponse.redirect(new URL("/login", request.url)));
  }

  if (await hubCookieIsValid(request.cookies.get(HUB_COOKIE)?.value)) {
    return withNoStore(NextResponse.next());
  }

  if (pathname.startsWith("/api/")) {
    return withNoStore(NextResponse.json({ error: "Unlock the hub to continue." }, { status: 401 }));
  }

  return withNoStore(NextResponse.redirect(new URL("/login", request.url)));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
