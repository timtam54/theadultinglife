"use client";

/*
 * Settings section for Face ID / fingerprint unlock: turn it on for this
 * device, and see or remove the devices it's on. Optional — the PIN always
 * works as well.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { faceIdAvailable, faceIdName, turnOnFaceId } from "@/lib/face-id-client";

export interface FaceIdDevice {
  id: string;
  label: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });

export function FaceIdSection({ devices }: { devices: FaceIdDevice[] }) {
  const router = useRouter();
  const [support, setSupport] = useState<{ name: string } | false | null>(null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    faceIdAvailable().then((ok) => {
      if (live) setSupport(ok ? { name: faceIdName() } : false);
    });
    return () => {
      live = false;
    };
  }, []);

  async function turnOn() {
    setBusy(true);
    setMessage(null);
    const result = await turnOnFaceId();
    setBusy(false);
    if (result.ok) router.refresh();
    else if (!result.cancelled) setMessage(result.message);
  }

  async function remove(id: string) {
    setRemoving(id);
    setMessage(null);
    const res = await fetch(`/api/security/face-id/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(
      () => null
    );
    setRemoving(null);
    if (res?.ok) router.refresh();
    else setMessage("Couldn't remove that device. Try again.");
  }

  return (
    <div>
      {devices.length > 0 && (
        <ul className="divide-y divide-tal-line rounded-xl border border-tal-line mb-4">
          {devices.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-tal-plum">{d.label ?? "Device"}</div>
                <div className="text-xs text-tal-plum-soft">
                  Turned on {fmt(d.createdAt)}
                  {d.lastUsedAt ? ` · last used ${fmt(d.lastUsedAt)}` : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(d.id)}
                disabled={removing === d.id}
                className="h-9 px-3 rounded-lg border border-tal-line bg-white text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
              >
                {removing === d.id ? "Removing…" : "Remove"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {support === false && (
        <p className="text-sm text-tal-plum-soft">
          This device or browser doesn&apos;t support Face ID or fingerprint
          unlock. Open The Adulting Life on your phone to turn it on there.
        </p>
      )}
      {support && (
        <button
          type="button"
          onClick={turnOn}
          disabled={busy}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-black text-white text-sm font-medium disabled:opacity-60"
        >
          {busy ? "Waiting for your device…" : `Turn on ${support.name} for this device`}
        </button>
      )}
      {message && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {message}
        </p>
      )}
    </div>
  );
}
