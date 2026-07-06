import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;
const TOKEN_BYTES = 32;
const MIN_PASSWORD_LENGTH = 10;
const SETUP_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h

export interface GeneratedToken {
  rawToken: string;
  tokenHash: string;
  expiresAt: string;
}

export function generateSetupToken(
  kind: "setup" | "reset" = "setup"
): GeneratedToken {
  const rawToken = randomBytes(TOKEN_BYTES).toString("base64url");
  const tokenHash = hashToken(rawToken);
  const ttl = kind === "setup" ? SETUP_TOKEN_TTL_MS : RESET_TOKEN_TTL_MS;
  const expiresAt = new Date(Date.now() + ttl).toISOString();
  return { rawToken, tokenHash, expiresAt };
}

export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function safeTokenMatch(rawToken: string, storedHash: string): boolean {
  const computed = hashToken(rawToken);
  const a = Buffer.from(computed, "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function validatePasswordStrength(password: unknown): string | null {
  if (typeof password !== "string") return "Password is required";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (password.length > 200) return "Password is too long";
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must include letters and numbers";
  }
  return null;
}
