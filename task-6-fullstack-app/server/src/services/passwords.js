// Password hashing with scrypt (built into Node.js, no native dependency).
// Stored format: scrypt$<salt in hex>$<hash in hex>
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb);
const KEY_LENGTH = 64;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPassword(password, stored) {
  const [algo, saltHex, hashHex] = String(stored).split("$");
  if (algo !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  // timingSafeEqual: the comparison takes the same time whether it matches or not
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
