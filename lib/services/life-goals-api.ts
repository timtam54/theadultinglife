import { NextResponse } from "next/server";
import { UnauthorizedError } from "@/lib/auth/session";
import { isUserInFamilyGroup } from "@/lib/db/users";
import { getLifeGoal, type LifeGoalRow } from "@/lib/db/life-goals";
import { apiError } from "@/lib/api-error";

/*
 * Shared helpers for the /api/life-goals route handlers: field parsing and
 * the "is this goal in my family group?" check.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TEXT = 4000;

/** Free text → trimmed string, or null when blank. undefined = not sent / invalid. */
export function parseText(v: unknown): string | null | undefined {
  if (v === null) return null;
  if (typeof v !== "string" || v.length > MAX_TEXT) return undefined;
  return v.trim() || null;
}

/** yyyy-MM-dd, or null to clear. undefined = not sent / invalid. */
export function parseDate(v: unknown): string | null | undefined {
  if (v === null || v === "") return null;
  if (typeof v !== "string" || !DATE_RE.test(v)) return undefined;
  return v;
}

export async function canAccessUser(
  userId: string,
  familyGroupId: string
): Promise<boolean> {
  return isUserInFamilyGroup(userId, familyGroupId);
}

/** The goal, if it belongs to someone in the caller's family group. */
export async function loadOwnedGoal(
  goalId: string,
  familyGroupId: string
): Promise<LifeGoalRow | null> {
  const goal = await getLifeGoal(goalId);
  if (!goal || goal.family_group_id !== familyGroupId) return null;
  return goal;
}

export function handleError(scope: string, e: unknown) {
  if (e instanceof UnauthorizedError) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return apiError(scope, e);
}
