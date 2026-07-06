import { cookies } from "next/headers";
import { findUserById } from "@/lib/db/users";
import type { UserRow } from "@/lib/db/types";

export const SESSION_COOKIE_NAME = "adultinglife_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

interface SessionData {
  userId: string;
  expiresAt: string;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  authProvider: string | null;
}

export interface Session {
  user: SessionUser;
  expiresAt: string;
}

function encode(data: SessionData): string {
  return Buffer.from(JSON.stringify(data)).toString("base64");
}

function decode(token: string): SessionData | null {
  try {
    const json = Buffer.from(token, "base64").toString("utf-8");
    const parsed = JSON.parse(json) as SessionData;
    if (!parsed.userId || !parsed.expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function toSessionUser(row: UserRow): SessionUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    authProvider: row.auth_provider,
  };
}

export async function createSession(userId: string): Promise<void> {
  const expiresAt = new Date(
    Date.now() + SESSION_MAX_AGE_SECONDS * 1000
  ).toISOString();
  const token = encode({ userId, expiresAt });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const data = decode(token);
  if (!data) return null;
  if (new Date(data.expiresAt).getTime() <= Date.now()) return null;
  const user = await findUserById(data.userId);
  if (!user) return null;
  return { user: toSessionUser(user), expiresAt: data.expiresAt };
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    throw new UnauthorizedError();
  }
  return session;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}
