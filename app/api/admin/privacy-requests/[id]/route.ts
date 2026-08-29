import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth/session";
import {
  getPrivacyRequest,
  updatePrivacyRequest,
  type PrivacyRequestStatus,
} from "@/lib/db/privacy-requests";

const STATUSES: PrivacyRequestStatus[] = [
  "new",
  "in_progress",
  "responded",
  "closed",
];

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  await requireSuperuser();
  const { id } = await ctx.params;
  const numeric = Number(id);
  if (!Number.isFinite(numeric)) {
    return NextResponse.json({ error: "bad_id" }, { status: 400 });
  }
  const row = await getPrivacyRequest(numeric);
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ request: row });
}

export async function PATCH(req: Request, ctx: Ctx) {
  await requireSuperuser();
  const { id } = await ctx.params;
  const numeric = Number(id);
  if (!Number.isFinite(numeric)) {
    return NextResponse.json({ error: "bad_id" }, { status: 400 });
  }
  const body = (await req.json().catch(() => null)) as {
    status?: string;
    adminNotes?: string | null;
    markResponded?: boolean;
  } | null;
  if (!body) return NextResponse.json({ error: "bad_body" }, { status: 400 });

  const patch: {
    status?: PrivacyRequestStatus;
    adminNotes?: string | null;
    respondedAt?: string | null;
  } = {};
  if (body.status !== undefined) {
    if (!(STATUSES as string[]).includes(body.status)) {
      return NextResponse.json({ error: "bad_status" }, { status: 400 });
    }
    patch.status = body.status as PrivacyRequestStatus;
  }
  if (body.adminNotes !== undefined) {
    patch.adminNotes = body.adminNotes;
  }
  if (body.markResponded) {
    patch.respondedAt = new Date().toISOString();
    if (!patch.status) patch.status = "responded";
  }

  const row = await updatePrivacyRequest(numeric, patch);
  return NextResponse.json({ request: row });
}
