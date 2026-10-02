import { randomBytes } from "node:crypto";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function encodeBase32(bytes) {
  let bits = "";
  for (const byte of bytes) bits += byte.toString(2).padStart(8, "0");
  let output = "";
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, "0");
    output += BASE32[Number.parseInt(chunk, 2)];
  }
  return output;
}

const secret = encodeBase32(randomBytes(20));
const issuer = "DBS Operations Hub";
const account = "ops-hub";
const uri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

process.stdout.write(`HUB_TOTP_SECRET=${secret}\n`);
process.stdout.write(`${uri}\n`);
