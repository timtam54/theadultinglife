import { NextResponse } from "next/server";
import { getSquareClient } from "@/lib/square/client";

export async function GET() {
  try {
    const client = getSquareClient();
    const { objects = [], errors } = await client.catalog.search({
      objectTypes: ["SUBSCRIPTION_PLAN"],
      includeRelatedObjects: true,
    });

    if (errors && errors.length > 0) {
      return NextResponse.json({ ok: false, errors }, { status: 502 });
    }

    const plans = objects
      .filter((obj) => obj.type === "SUBSCRIPTION_PLAN")
      .map((obj) => {
        if (obj.type !== "SUBSCRIPTION_PLAN") return null;
        const plan = obj.subscriptionPlanData;
        const variations = (plan?.subscriptionPlanVariations ?? []).map((v) => {
          if (v.type !== "SUBSCRIPTION_PLAN_VARIATION") {
            return { id: v.id };
          }
          const vd = v.subscriptionPlanVariationData;
          const firstPhase = vd?.phases?.[0];
          return {
            id: v.id,
            name: vd?.name,
            cadence: firstPhase?.cadence,
            periods: firstPhase?.periods,
            pricing: firstPhase?.pricing,
          };
        });
        return {
          planId: obj.id,
          name: plan?.name,
          eligibleItemIds: plan?.eligibleItemIds ?? [],
          variations,
        };
      })
      .filter((p) => p !== null);

    return NextResponse.json({ ok: true, count: plans.length, plans });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
