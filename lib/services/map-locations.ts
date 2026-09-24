import { createServiceClient } from "@/lib/supabase/server";

export interface MapLocation {
  lat: number;
  lon: number;
  address: string;
  subcategoryId: string;
  subcategoryName: string;
  questionLabel: string;
  userName: string;
}

interface AddressJson {
  address?: unknown;
  lat?: unknown;
  lon?: unknown;
}

function parseAddress(raw: string | null): {
  address: string;
  lat: number;
  lon: number;
} | null {
  if (!raw) return null;
  let parsed: AddressJson;
  try {
    parsed = JSON.parse(raw) as AddressJson;
  } catch {
    return null;
  }
  const address = typeof parsed.address === "string" ? parsed.address.trim() : "";
  const lat = typeof parsed.lat === "number" ? parsed.lat : null;
  const lon = typeof parsed.lon === "number" ? parsed.lon : null;
  if (!address || lat === null || lon === null) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { address, lat, lon };
}

// Pull every address-typed answer across the family group and return one row
// per plottable pin. Rows without lat/lon are skipped — no server-side
// geocoding, since Places autocomplete already stores coords on save.
export async function listFamilyMapLocations(
  familyGroupId: string
): Promise<MapLocation[]> {
  const supabase = createServiceClient();

  const usersRes = await supabase
    .from("users")
    .select("id, first_name, last_name")
    .eq("family_group_id", familyGroupId);
  if (usersRes.error) throw usersRes.error;
  const users = (usersRes.data ?? []) as {
    id: string;
    first_name: string | null;
    last_name: string | null;
  }[];
  if (users.length === 0) return [];
  const userNameById = new Map<string, string>();
  for (const u of users) {
    const name = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
    userNameById.set(u.id, name || "Family member");
  }

  const addrQRes = await supabase
    .from("page_questions")
    .select("id, subcategory_id, label")
    .eq("question_type", "address");
  if (addrQRes.error) throw addrQRes.error;
  const addressQuestions = (addrQRes.data ?? []) as {
    id: string;
    subcategory_id: string;
    label: string;
  }[];
  if (addressQuestions.length === 0) return [];
  const qById = new Map(addressQuestions.map((q) => [q.id, q]));

  const respRes = await supabase
    .from("question_responses")
    .select("user_id, question_id, value")
    .in(
      "user_id",
      users.map((u) => u.id)
    )
    .in(
      "question_id",
      addressQuestions.map((q) => q.id)
    );
  if (respRes.error) throw respRes.error;
  const responses = (respRes.data ?? []) as {
    user_id: string;
    question_id: string;
    value: string | null;
  }[];

  const subIds = Array.from(new Set(addressQuestions.map((q) => q.subcategory_id)));
  const subRes = await supabase
    .from("subcategories")
    .select("id, name")
    .in("id", subIds);
  if (subRes.error) throw subRes.error;
  const subNameById = new Map<string, string>(
    ((subRes.data ?? []) as { id: string; name: string }[]).map((s) => [
      s.id,
      s.name,
    ])
  );

  const out: MapLocation[] = [];
  for (const r of responses) {
    const parsed = parseAddress(r.value);
    if (!parsed) continue;
    const q = qById.get(r.question_id);
    if (!q) continue;
    out.push({
      lat: parsed.lat,
      lon: parsed.lon,
      address: parsed.address,
      subcategoryId: q.subcategory_id,
      subcategoryName: subNameById.get(q.subcategory_id) ?? q.subcategory_id,
      questionLabel: q.label,
      userName: userNameById.get(r.user_id) ?? "Family member",
    });
  }
  return out;
}
