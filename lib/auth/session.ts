import { cookies } from "next/headers";
import { findUserById } from "@/lib/db/users";
import type { UserRole, UserRow } from "@/lib/db/types";

export const SESSION_COOKIE_NAME = "adultinglife_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

// Set only while a superuser is impersonating another user. Holds the
// original admin's userId so we can restore it on exit.
export const SHADOW_ADMIN_COOKIE_NAME = "adultinglife_shadow_admin";

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
  // Present iff a superuser is currently impersonating `user`.
  impersonating: { originalAdmin: SessionUser } | null;
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
  cookieStore.delete(SHADOW_ADMIN_COOKIE_NAME);
}

export async function setSessionUserId(userId: string): Promise<void> {
  // Rewrites the session cookie in-place to point at a different userId,
  // preserving the current expiry. Used by impersonation start/exit.
  const cookieStore = await cookies();
  const current = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const currentData = current ? decode(current) : null;
  const expiresAt =
    currentData?.expiresAt ??
    new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString();
  const token = encode({ userId, expiresAt });
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function setShadowAdminId(userId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SHADOW_ADMIN_COOKIE_NAME, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function getShadowAdminId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SHADOW_ADMIN_COOKIE_NAME)?.value ?? null;
}

export async function clearShadowAdmin(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SHADOW_ADMIN_COOKIE_NAME);
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

  let impersonating: Session["impersonating"] = null;
  const shadowId = cookieStore.get(SHADOW_ADMIN_COOKIE_NAME)?.value;
  if (shadowId && shadowId !== data.userId) {
    const admin = await findUserById(shadowId);
    // Only honour the shadow cookie if the original account is still a
    // superuser. If they've been demoted or deleted, drop the state.
    if (admin && admin.role === "s") {
      impersonating = { originalAdmin: toSessionUser(admin) };
    }
  }

  return {
    user: toSessionUser(user),
    expiresAt: data.expiresAt,
    impersonating,
  };
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
  // If impersonating, the effective role is the target's role. Fall back to
  // the shadowed admin's role so admin-guarded routes still refuse during
  // impersonation (the admin should exit first).
  const effectiveRole =
    session.impersonating?.originalAdmin.role ?? session.user.role;
  if (effectiveRole !== "s") {
    throw new ForbiddenError();
  }
  return session;
}

// The identity we should treat as "acting" for admin operations that must NOT
// respect the impersonated user. Used by /api/admin/impersonate itself so an
// admin already impersonating user A can still start impersonating user B
// (via exit-then-start), and by audit logging.
export async function getEffectiveAdmin(): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session) return null;
  if (session.impersonating) return session.impersonating.originalAdmin;
  if (session.user.role === "s") return session.user;
  return null;
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
