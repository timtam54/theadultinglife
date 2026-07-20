import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { listRemindersForFamily } from "@/lib/services/reminders";
import { sendPushToAll } from "@/lib/services/push-sender";
import { apiError } from "@/lib/api-error";

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
      .select("id, family_group_id")
      .in("id", uniqueUserIds);
    if (uErr) throw uErr;
    const familyByUser = new Map<string, string>();
    for (const u of (userRows ?? []) as {
      id: string;
      family_group_id: string;
    }[]) {
      familyByUser.set(u.id, u.family_group_id);
    }

    // Cache reminders per family_group so we don't re-query for family members.
    const remindersByFamily = new Map<string, Awaited<ReturnType<typeof listRemindersForFamily>>>();

    const result = await sendPushToAll(async (userId) => {
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

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return apiError("api:cron.send-nudges.GET", e);
  }
}

function describeDue(days: number): string {
  if (days < 0) return `expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`;
  if (days === 0) return "due today";
  return `in ${days} day${days === 1 ? "" : "s"}`;
}
