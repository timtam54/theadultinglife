import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { loadPageFormByGroup } from "@/lib/services/pageForm";
import { getFile } from "@/lib/db/files";
import { createSignedDownloadUrl } from "@/lib/supabase/storage";
import { PassportPrintView } from "./PassportPrintView";

async function resolveFileUrl(
  userId: string,
  fileId: string | null | undefined
): Promise<string | null> {
  if (!fileId) return null;
  const row = await getFile(userId, fileId);
  if (!row) return null;
  try {
    return await createSignedDownloadUrl(row.storage_path, 60 * 15);
  } catch {
    return null;
  }
}

export default async function PassportPrintPage() {
  const session = await requireSession();
  const { questions, answers } = await loadPageFormByGroup(
    session.user.id,
    "passport"
  );
  if (questions.length === 0) notFound();

  const [portraitUrl, signatureUrl] = await Promise.all([
    resolveFileUrl(session.user.id, answers["passport.portrait"]),
    resolveFileUrl(session.user.id, answers["passport.signature"]),
  ]);

  return (
    <PassportPrintView
      answers={answers}
      portraitUrl={portraitUrl}
      signatureUrl={signatureUrl}
    />
  );
}
