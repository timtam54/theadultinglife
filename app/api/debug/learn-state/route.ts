import { NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/server";

// Diagnostic: shows raw learn_activity_days rows for the current user
// plus a manual insert attempt with full error output.
export async function GET() {
  try {
    const session = await requireSession();
    const supabase = createServiceClient();
    const userId = session.user.id;
    const today = new Date().toISOString().slice(0, 10);

    const rowsRes = await supabase
      .from("learn_activity_days")
      .select("*")
      .eq("user_id", userId)
      .order("activity_date", { ascending: false })
      .limit(20);

    const badgesRes = await supabase
      .from("user_badges")
      .select("*")
      .eq("user_id", userId);

    const testInsert = await supabase
      .from("learn_activity_days")
      .upsert(
        { user_id: userId, activity_date: today, activity_count: 1 },
        { onConflict: "user_id,activity_date" }
      )
      .select();

    return NextResponse.json({
      userId,
      today,
      activityRows: rowsRes.data,
      activityError: rowsRes.error,
      badgeRows: badgesRes.data,
      badgeError: badgesRes.error,
      testInsertData: testInsert.data,
      testInsertError: testInsert.error,
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
