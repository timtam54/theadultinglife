import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { listRemindersForFamily } from "@/lib/services/reminders";
import { sendPushToAll, sendPushToUser } from "@/lib/services/push-sender";
import {
  advanceRecurringReminder,
  markCustomReminderNotified,
} from "@/lib/db/custom-reminders";
import type { Recurrence } from "@/lib/db/types";
import { apiError } from "@/lib/api-error";

const CUSTOM_LEAD_DAYS = 7;
const LOCAL_SEND_HOUR = 8;
const DEFAULT_TIMEZONE = "Australia/Sydney";

function localHour(timezone: string, at: Date = new Date()): number | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    }).formatToParts(at);
    const h = parts.find((p) => p.type === "hour")?.value;
    if (h == null) return null;
    // "24" happens in some Node/ICU versions for midnight.
    const n = Number(h);
    return n === 24 ? 0 : n;
  } catch {
    return null;
  }
}

// Vercel Cron calls this with `Authorization: Bearer <CRON_SECRET>`.
// Locally you can hit it with the same header for testing.
export async function GET(request: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");
    if (secret) {
      const ok = authHeader === `Bearer ${secret}`;
      if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Preload user → family_group_id for every subscribed user.
    const { data: subs, error: subsErr } = await supabase
      .from("push_subscriptions")
      .select("user_id");
    if (subsErr) throw subsErr;
    const uniqueUserIds = Array.from(
      new Set(((subs ?? []) as { user_id: string }[]).map((s) => s.user_id))
    );
    if (uniqueUserIds.length === 0) {
      return NextResponse.json({ ok: true, users: 0, sent: 0 });
    }

    const { data: userRows, error: uErr } = await supabase
      .from("users")
      .select("id, family_group_id, timezone")
      .in("id", uniqueUserIds);
    if (uErr) throw uErr;
    const familyByUser = new Map<string, string>();
    const tzByUser = new Map<string, string>();
    for (const u of (userRows ?? []) as {
      id: string;
      family_group_id: string;
      timezone: string | null;
    }[]) {
      familyByUser.set(u.id, u.family_group_id);
      tzByUser.set(u.id, u.timezone ?? DEFAULT_TIMEZONE);
    }

    // Only send to users where it's currently ~8am local. The cron runs hourly.
    const now = new Date();
    const usersEligibleThisHour = new Set(
      Array.from(tzByUser.entries())
        .filter(([, tz]) => localHour(tz, now) === LOCAL_SEND_HOUR)
        .map(([userId]) => userId)
    );
    if (usersEligibleThisHour.size === 0) {
      return NextResponse.json({ ok: true, users: 0, sent: 0 });
    }

    // Cache reminders per family_group so we don't re-query for family members.
    const remindersByFamily = new Map<string, Awaited<ReturnType<typeof listRemindersForFamily>>>();

    const result = await sendPushToAll(async (userId) => {
      if (!usersEligibleThisHour.has(userId)) return null;
      const familyGroupId = familyByUser.get(userId);
      if (!familyGroupId) return null;
      let reminders = remindersByFamily.get(familyGroupId);
      if (!reminders) {
        reminders = await listRemindersForFamily(familyGroupId);
        remindersByFamily.set(familyGroupId, reminders);
      }
      // Only urgent for THIS user (their own records + fields).
      const urgent = reminders.filter(
        (r) => r.userId === userId && r.daysUntil <= 30
      );
      if (urgent.length === 0) return null;
      const first = urgent[0];
      const rest = urgent.length - 1;
      const title =
        urgent.length === 1
          ? "Coming up soon"
          : `${urgent.length} items need attention`;
      const body =
        rest > 0
          ? `${first.title} · +${rest} more`
          : `${first.title} — ${describeDue(first.daysUntil)}`;
      return {
        title,
        body,
        url: "/reminders",
        tag: "tal-urgent-reminders",
      };
    });

    // Custom reminders: one-off push per reminder when it hits the 7-day window,
    // idempotent via notified_at. Different from the daily digest above — we
    // don't want to spam users every day for the same custom reminder.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoff = new Date(today.getTime() + CUSTOM_LEAD_DAYS * 86_400_000)
      .toISOString()
      .slice(0, 10);

    const eligibleUserIds = Array.from(usersEligibleThisHour);
    const { data: dueCustoms, error: cErr } = await supabase
      .from("custom_reminders")
      .select(
        "id, user_id, title, due_date, recurrence, snoozed_until, completed_at"
      )
      .in("user_id", eligibleUserIds)
      .is("dismissed_at", null)
      .is("notified_at", null)
      .is("completed_at", null)
      .lte("due_date", cutoff);
    if (cErr) throw cErr;

    let customSent = 0;
    for (const c of (dueCustoms ?? []) as {
      id: string;
      user_id: string;
      title: string;
      due_date: string;
      recurrence: Recurrence | null;
      snoozed_until: string | null;
      completed_at: string | null;
    }[]) {
      // If snoozed past the notification window, skip.
      const effective = c.snoozed_until ?? c.due_date;
      if (effective > cutoff) continue;

      const due = new Date(effective);
      due.setHours(0, 0, 0, 0);
      const days = Math.round(
        (due.getTime() - today.getTime()) / 86_400_000
      );
      const when =
        days < 0
          ? `overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`
          : days === 0
            ? "due today"
            : `in ${days} day${days === 1 ? "" : "s"}`;
      const res = await sendPushToUser(c.user_id, {
        title: "Reminder coming up",
        body: `${c.title} — ${when}`,
        url: "/reminders",
        tag: `tal-custom-${c.id}`,
      });
      if (res.sent > 0) customSent += res.sent;
      if (c.recurrence) {
        // Recurring: bump due_date to next occurrence, keep alive.
        await advanceRecurringReminder(c.id, c.due_date, c.recurrence);
      } else {
        await markCustomReminderNotified(c.id);
      }
    }

    return NextResponse.json({ ok: true, ...result, customSent });
  } catch (e) {
    return apiError("api:cron.send-nudges.GET", e);
  }
}

function describeDue(days: number): string {
  if (days < 0) return `expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`;
  if (days === 0) return "due today";
  return `in ${days} day${days === 1 ? "" : "s"}`;
}
