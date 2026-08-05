import { NextResponse } from "next/server";
import { getSquareClient } from "@/lib/square/client";

export async function GET() {
  try {
    const client = getSquareClient();
    const { locations = [], errors } = await client.locations.list();

    if (errors && errors.length > 0) {
      return NextResponse.json({ ok: false, errors }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      environment: process.env.SQUARE_ENVIRONMENT ?? "sandbox",
      count: locations.length,
      locations: locations.map((l) => ({
        id: l.id,
        name: l.name,
        status: l.status,
        currency: l.currency,
        country: l.country,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
