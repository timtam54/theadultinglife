import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import {
  createUserRecord,
  isCategoryId,
  listUserRecords,
} from "@/lib/services/records";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const categoryId = request.nextUrl.searchParams.get("categoryId");
    const search = request.nextUrl.searchParams.get("q") ?? undefined;
    const rows = await listUserRecords(session.user.id, {
      categoryId: categoryId && isCategoryId(categoryId) ? categoryId : undefined,
      search,
    });
    return NextResponse.json({ records: rows });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/records]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const created = await createUserRecord(session.user.id, body);
    return NextResponse.json({ record: created }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const msg = e instanceof Error ? e.message : "server_error";
    console.error("[POST /api/records]", e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
