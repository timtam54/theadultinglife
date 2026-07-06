import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";

const MARKETING_URL = "https://theadultinglife.com.au/";

export async function POST() {
  await destroySession();
  return NextResponse.redirect(MARKETING_URL, 303);
}

export async function GET() {
  await destroySession();
  return NextResponse.redirect(MARKETING_URL, 303);
}
