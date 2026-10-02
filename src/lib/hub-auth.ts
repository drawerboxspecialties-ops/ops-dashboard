export const HUB_COOKIE = "dbs_hub";
export const MFA_PENDING_COOKIE = "dbs_hub_mfa";

const encoder = new TextEncoder();
const MFA_PENDING_MAX_AGE = 60 * 5;

export function hubPassword() {
  return process.env.HUB_PASSWORD?.trim() ?? "";
}

export function hubAuthEnabled() {
  return Boolean(hubPassword());
}

function hex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmac(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return hex(signature);
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) {
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return diff === 0;
}

async function matchesSecret(secret: string, candidate: string) {
  if (!secret) return false;
  const [left, right] = await Promise.all([hmac(secret, candidate), hmac(secret, secret)]);
  return safeEqual(left, right);
}

export async function passwordMatches(candidate: string) {
  return matchesSecret(hubPassword(), candidate);
}

function backupCodeLooksValid(value: string) {
  const compact = value.trim();
  if (compact.length < 4 || compact.length > 32) return false;
  return !/^\d{6}$/.test(compact);
}

async function hashBackupCode(code: string) {
  const pepper = hubPassword();
  const normalized = code.trim();
  const data = encoder.encode(`${pepper}:backup:${normalized}`);
  return hex(await crypto.subtle.digest("SHA-256", data));
}

function storedBackupHashes() {
  return (process.env.HUB_BACKUP_HASHES ?? "")
    .split(/[,\s]+/)
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length === 64);
}

export async function backupCodeMatches(candidate: string) {
  const compact = candidate.trim();
  if (!compact) return false;
  const recovery = process.env.HUB_MFA_RECOVERY?.trim() ?? "";
  if (recovery && (await matchesSecret(recovery, compact))) return true;
  if (!backupCodeLooksValid(compact)) return false;
  const hashed = await hashBackupCode(compact);
  return storedBackupHashes().some((hash) => safeEqual(hash, hashed));
}

export async function hubCookieValue() {
  const password = hubPassword();
  if (!password) return "";
  return hmac(password, "dbs-ops-dashboard-session");
}

export async function hubCookieIsValid(value: string | undefined) {
  if (!value) return false;
  const expected = await hubCookieValue();
  return Boolean(expected) && safeEqual(value, expected);
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

export async function mfaPendingCookieValue() {
  const password = hubPassword();
  if (!password) return "";
  return hmac(password, "dbs-ops-dashboard-mfa-pending");
}

export async function mfaPendingCookieIsValid(value: string | undefined) {
  if (!value) return false;
  const expected = await mfaPendingCookieValue();
  return Boolean(expected) && safeEqual(value, expected);
}

export function mfaPendingCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MFA_PENDING_MAX_AGE,
  };
}

type CookieResponse = {
  cookies: {
    set: (
      name: string,
      value: string,
      options: {
        path: string;
        maxAge: number;
        httpOnly?: boolean;
        secure?: boolean;
        sameSite?: "lax" | "strict" | "none";
      },
    ) => unknown;
  };
};

export function clearHubCookies<T extends CookieResponse>(response: T) {
  const expired = { maxAge: 0 as const };
  response.cookies.set(HUB_COOKIE, "", { ...cookieOptions(), ...expired });
  response.cookies.set(MFA_PENDING_COOKIE, "", { ...mfaPendingCookieOptions(), ...expired });
  return response;
}
