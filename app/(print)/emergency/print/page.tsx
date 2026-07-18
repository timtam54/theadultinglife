import { requireSession } from "@/lib/auth/session";
import { buildEmergencyView } from "@/lib/services/emergency";
import { EmergencyPrintView } from "@/components/EmergencyPrintView";

export default async function EmergencyPrintPage() {
  const session = await requireSession();
  const { sections, users } = await buildEmergencyView(
    session.user.familyGroupId
  );
  return <EmergencyPrintView sections={sections} userCount={users.length} />;
}
