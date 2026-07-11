import { cookies } from "next/headers";
import { findUserById } from "@/lib/db/users";
import type { UserRole, UserRow } from "@/lib/db/types";

export const SESSION_COOKIE_NAME = "adultinglife_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

interface SessionData {
  userId: string;
  expiresAt: string;
}

export interface SessionUser {
  id: string;
  email: string | null;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  authProvider: string | null;
  role: UserRole;
  familyGroupId: string;
  isPrimary: boolean;
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
    firstName: row.first_name,
    lastName: row.last_name,
    avatarUrl: row.avatar_url,
    authProvider: row.auth_provider,
    role: row.role,
    familyGroupId: row.family_group_id,
    isPrimary: row.is_primary,
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

export async function requireSuperuser(): Promise<Session> {
  const session = await requireSession();
  if (session.user.role !== "s") {
    throw new ForbiddenError();
  }
  return session;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super("Forbidden");
    this.name = "ForbiddenError";
  }
}
