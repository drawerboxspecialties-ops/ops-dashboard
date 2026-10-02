import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  backupCodeMatches,
  cookieOptions,
  HUB_COOKIE,
  hubCookieValue,
  MFA_PENDING_COOKIE,
  mfaPendingCookieIsValid,
  mfaPendingCookieOptions,
  mfaPendingCookieValue,
  passwordMatches,
} from "@/lib/hub-auth";
import { totpEnabled, totpMatches } from "@/lib/totp";

function clearPending(response: NextResponse) {
  response.cookies.set(MFA_PENDING_COOKIE, "", { ...mfaPendingCookieOptions(), maxAge: 0 });
}

async function unlockHub() {
  const response = NextResponse.json({ ok: true });
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.cookies.set(HUB_COOKIE, await hubCookieValue(), cookieOptions());
  clearPending(response);
  return response;
}

async function secondFactorMatches(code: string) {
  if (await totpMatches(code)) return true;
  if (await backupCodeMatches(code)) return true;
  return false;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: string; code?: string };
    const password = String(body.password ?? "");
    const code = String(body.code ?? "").trim();
    const jar = await cookies();
    const pendingOk = await mfaPendingCookieIsValid(jar.get(MFA_PENDING_COOKIE)?.value);

    if (totpEnabled() && code) {
      const passwordOk = password ? await passwordMatches(password) : pendingOk;
      if (!passwordOk) {
        return NextResponse.json({ error: "Enter the hub password again." }, { status: 401 });
      }
      if (!(await secondFactorMatches(code))) {
        return NextResponse.json({ error: "Wrong authenticator or backup code." }, { status: 401 });
      }
      return unlockHub();
    }

    if (!(await passwordMatches(password))) {
      return NextResponse.json({ error: "Wrong password." }, { status: 401 });
    }

    if (!totpEnabled()) return unlockHub();

    const response = NextResponse.json({ ok: true, mfaRequired: true });
    response.cookies.set(MFA_PENDING_COOKIE, await mfaPendingCookieValue(), mfaPendingCookieOptions());
    return response;
  } catch {
    return NextResponse.json({ error: "Enter the hub password." }, { status: 400 });
  }
}
