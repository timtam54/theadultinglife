import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";

export async function POST() {
  await destroySession();
  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  await destroySession();
  const url = new URL("/login", request.url);
  return NextResponse.redirect(url);
}
