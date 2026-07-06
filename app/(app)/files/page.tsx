import { requireSession } from "@/lib/auth/session";
import { listUserFiles, usageForUser } from "@/lib/services/files";
import { FilesClient } from "@/components/FilesClient";

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

export default async function FilesPage() {
  const session = await requireSession();
  const [files, usage] = await Promise.all([
    listUserFiles(session.user.id),
    usageForUser(session.user.id),
  ]);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <h1 className="font-display text-3xl text-tal-plum">Documents</h1>
        <p className="text-sm text-tal-plum-soft">
          {usage.count} files · {fmtBytes(usage.totalBytes)}
        </p>
      </div>
      <p className="text-tal-plum-soft mb-6">
        Upload documents and photos. Files stay private to you — downloads use
        short-lived signed links.
      </p>
      <FilesClient initial={files} />
    </div>
  );
}
