import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { findUserById } from "@/lib/db/users";
import type { UserRole, UserRow } from "@/lib/db/types";

export const SESSION_COOKIE_NAME = "adultinglife_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

// Set only while a superuser is impersonating another user. Holds the
// original admin's userId so we can restore it on exit.
export const SHADOW_ADMIN_COOKIE_NAME = "adultinglife_shadow_admin";

// Session cookies are signed with HMAC-SHA256 (jose HS256). The secret must be
// set in the environment; if it isn't, we fail loudly rather than silently
// falling back to unsigned cookies — that would defeat the whole point.
const SESSION_ALG = "HS256";
let cachedSecret: Uint8Array | null = null;
function getSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;
  const raw = process.env.SESSION_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error(
      "SESSION_SECRET env var is missing or too short (need ≥32 chars). " +
        "Generate one with: openssl rand -hex 32"
    );
  }
  cachedSecret = new TextEncoder().encode(raw);
  return cachedSecret;
}

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
  timezone: string | null;
  deletedAt: string | null;
}

export interface Session {
  user: SessionUser;
  expiresAt: string;
  // Present iff a superuser is currently impersonating `user`.
  impersonating: { originalAdmin: SessionUser } | null;
}

async function encode(data: SessionData): Promise<string> {
  const expSeconds = Math.floor(new Date(data.expiresAt).getTime() / 1000);
  return await new SignJWT({ uid: data.userId })
    .setProtectedHeader({ alg: SESSION_ALG })
    .setExpirationTime(expSeconds)
    .sign(getSecret());
}

async function decode(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: [SESSION_ALG],
    });
    const userId = typeof payload.uid === "string" ? payload.uid : null;
    const exp = typeof payload.exp === "number" ? payload.exp : null;
    if (!userId || !exp) return null;
    return { userId, expiresAt: new Date(exp * 1000).toISOString() };
  } catch {
    // Verification failure (bad signature, expired, malformed) → session absent
    return null;
  }
}

// Shadow-admin cookie is a signed JWT too — same reasoning. We only need to
// carry the admin's userId; expiry matches the session lifetime.
async function encodeShadow(userId: string): Promise<string> {
  const expSeconds =
    Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  return await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: SESSION_ALG })
    .setExpirationTime(expSeconds)
    .sign(getSecret());
}

async function decodeShadow(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: [SESSION_ALG],
    });
    return typeof payload.uid === "string" ? payload.uid : null;
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
    timezone: row.timezone,
    deletedAt: row.deleted_at,
  };
}

export async function createSession(userId: string): Promise<void> {
  const expiresAt = new Date(
    Date.now() + SESSION_MAX_AGE_SECONDS * 1000
  ).toISOString();
  const token = await encode({ userId, expiresAt });
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
  const currentData = current ? await decode(current) : null;
  const expiresAt =
    currentData?.expiresAt ??
    new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString();
  const token = await encode({ userId, expiresAt });
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
  const token = await encodeShadow(userId);
  cookieStore.set(SHADOW_ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function getShadowAdminId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SHADOW_ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  return await decodeShadow(token);
}

export async function clearShadowAdmin(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SHADOW_ADMIN_COOKIE_NAME);
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const data = await decode(token);
  if (!data) return null;
  if (new Date(data.expiresAt).getTime() <= Date.now()) return null;
  const user = await findUserById(data.userId);
  if (!user) return null;

  let impersonating: Session["impersonating"] = null;
  const shadowToken = cookieStore.get(SHADOW_ADMIN_COOKIE_NAME)?.value;
  const shadowId = shadowToken ? await decodeShadow(shadowToken) : null;
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
