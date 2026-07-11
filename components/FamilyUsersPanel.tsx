"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { MemberKind } from "@/lib/db/types";

interface FamilyUser {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  member_kind: MemberKind;
  is_primary: boolean;
}

export function FamilyUsersPanel({ initialUsers }: { initialUsers: FamilyUser[] }) {
  const router = useRouter();
  const [users, setUsers] = useState<FamilyUser[]>(initialUsers);
  const [editing, setEditing] = useState<FamilyUser | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setUsers(initialUsers), [initialUsers]);

  async function refresh() {
    const res = await fetch("/api/family-users");
    if (res.ok) {
      const body = (await res.json()) as { users: FamilyUser[] };
      setUsers(body.users);
      router.refresh();
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-tal-plum">People in this family</h2>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setAdding(true);
          }}
          className="h-9 px-3 rounded-xl bg-tal-plum text-white text-sm font-medium hover:bg-tal-plum-dark"
        >
          + Add user
        </button>
      </div>

      {users.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-tal-line bg-white p-6 text-sm text-tal-plum-soft">
          No users yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {users.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setEditing(u);
                }}
                className="w-full text-left flex items-center justify-between rounded-xl border border-tal-line bg-white px-4 py-3 hover:shadow-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium text-tal-plum truncate">
                    {[u.first_name, u.last_name].filter(Boolean).join(" ") ||
                      u.email ||
                      "Untitled"}
                    {u.is_primary && (
                      <span className="ml-2 text-[10px] uppercase tracking-widest text-tal-plum-soft bg-tal-cream-soft px-1.5 py-0.5 rounded">
                        Primary login
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-tal-plum-soft mt-0.5">
                    {u.member_kind}
                    {u.email ? ` · ${u.email}` : ""}
                  </div>
                </div>
                <span className="text-tal-plum-soft">›</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <div className="mt-3 p-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl">
          {error}
        </div>
      )}

      {(adding || editing) && (
        <UserModal
          user={editing}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSaved={async () => {
            setAdding(false);
            setEditing(null);
            await refresh();
          }}
          onError={setError}
        />
      )}
    </div>
  );
}

function UserModal({
  user,
  onClose,
  onSaved,
  onError,
}: {
  user: FamilyUser | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const isEdit = user !== null;
  const [firstName, setFirstName] = useState(user?.first_name ?? "");
  const [lastName, setLastName] = useState(user?.last_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [memberKind, setMemberKind] = useState<MemberKind>(
    user?.member_kind ?? "adult"
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const body = {
        firstName: firstName.trim(),
        lastName: lastName.trim() || null,
        email: email.trim() || null,
        memberKind,
      };
      const url = isEdit ? `/api/family-users/${user!.id}` : "/api/family-users";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        throw new Error(b.message ?? b.error ?? "save_failed");
      }
      await onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : "save_failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!isEdit) return;
    if (!confirm(`Remove ${firstName || "this user"} from the family?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/family-users/${user!.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? "delete_failed");
      }
      await onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : "delete_failed");
    } finally {
      setDeleting(false);
    }
  }

  const busy = saving || deleting;

  return (
    <div
      className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4"
      onClick={busy ? undefined : onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg text-tal-plum mb-4">
          {isEdit ? "Edit user" : "Add user to family"}
        </h3>

        <div className="space-y-3">
          <Field label="First name">
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full h-11 rounded-xl border border-tal-line px-3 bg-white text-sm"
              autoFocus
            />
          </Field>
          <Field label="Last name">
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full h-11 rounded-xl border border-tal-line px-3 bg-white text-sm"
            />
          </Field>
          <Field label="Kind">
            <select
              value={memberKind}
              onChange={(e) => setMemberKind(e.target.value as MemberKind)}
              className="w-full h-11 rounded-xl border border-tal-line px-3 bg-white text-sm"
            >
              <option value="adult">Adult</option>
              <option value="child">Child</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field
            label={
              user?.is_primary
                ? "Email (used to sign in)"
                : "Email (optional — for later login)"
            }
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={user?.is_primary}
              className="w-full h-11 rounded-xl border border-tal-line px-3 bg-white text-sm disabled:bg-tal-cream-soft disabled:text-tal-plum-soft"
              placeholder="jane@example.com"
            />
          </Field>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <div>
            {isEdit && !user!.is_primary && (
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="h-9 px-3 rounded-xl text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
              >
                {deleting ? "Removing…" : "Remove"}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="h-9 px-3 rounded-xl text-sm text-tal-plum hover:bg-tal-cream-soft disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={busy || !firstName.trim()}
              className="h-9 px-4 rounded-xl bg-tal-plum text-white text-sm font-medium hover:bg-tal-plum-dark disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-xs uppercase tracking-wider text-tal-plum-soft mb-1">
        {label}
      </div>
      {children}
    </label>
  );
}
