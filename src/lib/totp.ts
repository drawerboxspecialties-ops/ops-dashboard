const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function totpSecret() {
  return (process.env.HUB_TOTP_SECRET ?? "").replace(/\s+/g, "").toUpperCase();
}

export function totpEnabled() {
  return totpSecret().length >= 16;
}

function decodeBase32(value: string) {
  const cleaned = value.replace(/=+$/g, "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const char of cleaned) {
    const index = BASE32.indexOf(char);
    if (index < 0) continue;
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }
  return bytes;
}

function counterBytes(counter: number) {
  const bytes = new Uint8Array(8);
  let value = Math.floor(counter);
  for (let i = 7; i >= 0; i -= 1) {
    bytes[i] = value & 0xff;
    value = Math.floor(value / 256);
  }
  return bytes;
}

async function hotp(secret: Uint8Array, counter: number) {
  const keyBytes = Uint8Array.from(secret);
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const hmac = new Uint8Array(await crypto.subtle.sign("HMAC", key, counterBytes(counter)));
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

function digitsOnly(code: string) {
  return code.replace(/\D/g, "").slice(0, 6);
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) {
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return diff === 0;
}

async function totpCodeAt(secret: Uint8Array, timestampMs = Date.now()) {
  return hotp(secret, Math.floor(timestampMs / 1000 / 30));
}

export async function totpMatches(code: string, secret = totpSecret()) {
  const cleaned = digitsOnly(code);
  if (cleaned.length !== 6 || secret.length < 16) return false;
  const key = decodeBase32(secret);
  if (key.length < 10) return false;
  const now = Date.now();
  for (const offset of [-1, 0, 1]) {
    const expected = await totpCodeAt(key, now + offset * 30_000);
    if (safeEqual(expected, cleaned)) return true;
  }
  return false;
}
