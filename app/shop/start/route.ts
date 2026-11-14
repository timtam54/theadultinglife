import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

// GET — "Start now" on the shop's app subscription row. Signed-in people go
// straight to the subscribe page; everyone else signs up first, and a cookie
// remembers to bring them to the subscribe page once the app's first-time
// steps (terms, age, welcome tour) are done (see AfterSetupRedirect).
const AFTER_SETUP_COOKIE = "tal_after_setup";

export async function GET(request: Request) {
  const session = await getSession();
  const url = new URL(session ? "/subscription" : "/login", request.url);
  const res = NextResponse.redirect(url);
  if (!session) {
    res.cookies.set(AFTER_SETUP_COOKIE, "subscription", { path: "/", maxAge: 60 * 60 * 24, sameSite: "lax" });
  }
  return res;
}
