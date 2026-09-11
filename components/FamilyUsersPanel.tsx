"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { MemberKind } from "@/lib/db/types";
import { AddressInput } from "@/components/AddressInput";

interface FamilyUser {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  member_kind: MemberKind;
  is_primary: boolean;
  birthday?: string | null;
  mobile_phone?: string | null;
  home_phone?: string | null;
  home_address?: string | null;
  mailing_address?: string | null;
}

export function FamilyUsersPanel({
  initialUsers,
  initialAllUsersAddedAt,
  canConfirm,
}: {
  initialUsers: FamilyUser[];
  initialAllUsersAddedAt: string | null;
  canConfirm: boolean;
}) {
  const router = useRouter();
  const [users, setUsers] = useState<FamilyUser[]>(initialUsers);
  const allUsersAddedAt = initialAllUsersAddedAt;
  const [editing, setEditing] = useState<FamilyUser | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function refresh() {
    router.refresh();
  }

  function applySavedUser(saved: FamilyUser) {
    setUsers((prev) => {
      const idx = prev.findIndex((u) => u.id === saved.id);
      if (idx === -1) return [...prev, saved];
      const next = prev.slice();
      next[idx] = saved;
      return next;
    });
  }

  function removeUserLocally(id: string) {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }

  async function confirmAllAdded() {
    setConfirming(true);
    setError(null);
    try {
      const res = await fetch("/api/family-groups/all-users-added", {
        method: "POST",
      });
      if (!res.ok) throw new Error("confirm_failed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "confirm_failed");
    } finally {
      setConfirming(false);
    }
  }

  async function undoAllAdded() {
    setConfirming(true);
    setError(null);
    try {
      const res = await fetch("/api/family-groups/all-users-added", {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("undo_failed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "undo_failed");
    } finally {
      setConfirming(false);
    }
  }

  const onlyPrimary = users.length === 1 && users[0]?.is_primary;
  const showConfirmPrompt = canConfirm && allUsersAddedAt == null;
  const showUndoBanner = canConfirm && allUsersAddedAt != null;

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
          className="h-9 px-3 rounded-xl bg-black text-white text-sm font-medium"
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

      {showConfirmPrompt && (
        <div className="mt-4 rounded-xl border border-tal-line bg-tal-cream-soft p-4">
          <div className="text-sm text-tal-plum mb-2">
            {onlyPrimary
              ? "Is it just you in your family? Or do you have more members to add?"
              : "Have you added everyone in your family? Or are there more members to add?"}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={confirmAllAdded}
              disabled={confirming}
              className="h-9 px-3 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-60"
            >
              {confirming
                ? "Saving…"
                : onlyPrimary
                ? "Yes, just me"
                : "Yes, everyone is added"}
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setAdding(true);
              }}
              disabled={confirming}
              className="h-9 px-3 rounded-xl border border-tal-line text-tal-plum text-sm hover:bg-white disabled:opacity-60"
            >
              No, add another
            </button>
          </div>
        </div>
      )}

      {showUndoBanner && (
        <div className="mt-4 rounded-xl border border-green-100 bg-green-50/60 p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm text-tal-plum">
            You&apos;ve marked your family list as complete.
          </div>
          <button
            type="button"
            onClick={undoAllAdded}
            disabled={confirming}
            className="h-8 px-3 rounded-xl text-sm text-tal-plum hover:bg-white disabled:opacity-60"
          >
            {confirming ? "…" : "Undo"}
          </button>
        </div>
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
          onSaved={async (saved) => {
            if (saved) applySavedUser(saved);
            setAdding(false);
            setEditing(null);
            await refresh();
          }}
          onRemoved={(id) => {
            removeUserLocally(id);
            setAdding(false);
            setEditing(null);
            void refresh();
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
  onRemoved,
  onError,
}: {
  user: FamilyUser | null;
  onClose: () => void;
  onSaved: (saved: FamilyUser | null) => Promise<void>;
  onRemoved: (id: string) => void;
  onError: (msg: string) => void;
}) {
  const isEdit = user !== null;
  const [firstName, setFirstName] = useState(user?.first_name ?? "");
  const [lastName, setLastName] = useState(user?.last_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [memberKind, setMemberKind] = useState<MemberKind>(
    user?.member_kind ?? "adult"
  );
  // Tracks whether the current Kind is derived from the birthday (auto) or
  // was picked by the user (manual override). We only auto-flip Kind when
  // the birthday changes AND the user hasn't overridden — respects intent.
  const [kindDerived, setKindDerived] = useState<boolean>(false);
  const [birthday, setBirthday] = useState(user?.birthday ?? "");
  const [mobilePhone, setMobilePhone] = useState(user?.mobile_phone ?? "");
  const [homePhone, setHomePhone] = useState(user?.home_phone ?? "");
  const [homeAddress, setHomeAddress] = useState(user?.home_address ?? "");
  const [mailingAddress, setMailingAddress] = useState(
    user?.mailing_address ?? ""
  );

  function computeKindFromBirthday(iso: string): MemberKind | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
    return age >= 18 ? "adult" : "child";
  }

  function handleBirthdayChange(iso: string) {
    setBirthday(iso);
    const derived = computeKindFromBirthday(iso);
    if (derived) {
      setMemberKind(derived);
      setKindDerived(true);
    }
  }

  function handleKindPick(k: MemberKind) {
    setMemberKind(k);
    setKindDerived(false);
  }
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
        birthday: birthday || null,
        mobilePhone: mobilePhone.trim() || null,
        homePhone: homePhone.trim() || null,
        homeAddress: homeAddress.trim() || null,
        mailingAddress: mailingAddress.trim() || null,
      };
      const url = isEdit ? `/api/family-users/${user!.id}` : "/api/family-users";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const responseBody = (await res.json().catch(() => ({}))) as {
        user?: {
          id: string;
          email: string | null;
          first_name: string | null;
          last_name: string | null;
          member_kind: MemberKind;
          is_primary: boolean;
          birthday: string | null;
          mobile_phone: string | null;
          home_phone: string | null;
          home_address: string | null;
          mailing_address: string | null;
        };
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        throw new Error(
          responseBody.message ?? responseBody.error ?? "save_failed"
        );
      }
      const saved: FamilyUser | null = responseBody.user
        ? {
            id: responseBody.user.id,
            email: responseBody.user.email,
            first_name: responseBody.user.first_name,
            last_name: responseBody.user.last_name,
            member_kind: responseBody.user.member_kind,
            is_primary: responseBody.user.is_primary,
            birthday: responseBody.user.birthday,
            mobile_phone: responseBody.user.mobile_phone,
            home_phone: responseBody.user.home_phone,
            home_address: responseBody.user.home_address,
            mailing_address: responseBody.user.mailing_address,
          }
        : null;
      await onSaved(saved);
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
      onRemoved(user!.id);
    } catch (e) {
      onError(e instanceof Error ? e.message : "delete_failed");
    } finally {
      setDeleting(false);
    }
  }

  const busy = saving || deleting;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  return (
    <div
      className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4"
      onClick={busy ? undefined : onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Close"
          className="absolute top-3 right-3 h-8 w-8 rounded-full text-tal-plum-soft hover:bg-tal-cream-soft hover:text-tal-plum flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        <h3 className="font-display text-lg text-tal-plum mb-4 pr-8">
          {isEdit ? "Edit user" : "Add user to family"}
        </h3>

        <div className="space-y-3">
          <Field
            label="First name"
            hint="Use the name that matches this person's official ID (passport, driver's licence, birth certificate). Nicknames can be added later on individual forms if needed."
          >
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
          <Field label="Birthday">
            <input
              type="date"
              value={birthday}
              onChange={(e) => handleBirthdayChange(e.target.value)}
              className="w-full h-11 rounded-xl border border-tal-line px-3 bg-white text-sm"
            />
          </Field>
          <Field label="Kind">
            <div className="grid grid-cols-2 gap-2">
              <MemberKindOption
                value="adult"
                current={memberKind}
                onSelect={handleKindPick}
                label="Adult"
                tooltip="Someone who's taking responsibility for their own life admin. Uses the adult General Information Form, which includes work, business and full contact details."
              />
              <MemberKindOption
                value="child"
                current={memberKind}
                onSelect={handleKindPick}
                label="Child"
                tooltip="Someone whose life admin is being managed for them by a parent or guardian. Uses the simpler child General Information Form (school, medical, family contacts). They can graduate to an Adult organiser as they grow up."
              />
            </div>
            {kindDerived && birthday && (
              <div className="text-xs text-tal-plum-soft mt-1 flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
                  <path d="M12 9v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <circle cx="12" cy="16.5" r="1" fill="currentColor" />
                </svg>
                Calculated from birthday · tap the other option to override.
              </div>
            )}
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

          {/* Core profile — these become the source-of-truth that other forms
              (passport, employment, medical, etc.) will prefill from. Grouped
              under a subtle heading so the dialog doesn't feel overwhelming. */}
          <div className="pt-4 mt-2 border-t border-tal-line">
            <div className="text-[10px] uppercase tracking-widest text-tal-plum-soft font-semibold mb-3">
              Profile details
              <span className="ml-1 normal-case tracking-normal font-normal text-tal-plum-soft/80">
                — used to pre-fill forms across the app
              </span>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Mobile phone">
                  <input
                    type="tel"
                    value={mobilePhone}
                    onChange={(e) => setMobilePhone(e.target.value)}
                    className="w-full h-11 rounded-xl border border-tal-line px-3 bg-white text-sm"
                    placeholder="0400 000 000"
                  />
                </Field>
                <Field label="Home phone">
                  <input
                    type="tel"
                    value={homePhone}
                    onChange={(e) => setHomePhone(e.target.value)}
                    className="w-full h-11 rounded-xl border border-tal-line px-3 bg-white text-sm"
                    placeholder="Optional"
                  />
                </Field>
              </div>
              <Field label="Home address">
                <AddressInput
                  value={homeAddress}
                  onChange={setHomeAddress}
                  placeholder="Start typing an address…"
                  ariaLabel="Home address"
                />
              </Field>
              <Field label="Mailing address (if different)">
                <AddressInput
                  value={mailingAddress}
                  onChange={setMailingAddress}
                  placeholder="Leave blank if same as home address"
                  ariaLabel="Mailing address"
                />
              </Field>
            </div>
          </div>
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
              className="h-9 px-4 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-60"
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
  hint,
  children,
}: {
  label: string;
  /** Small helper text shown below the field. Use for clarifying what to
   *  type (e.g. legal name vs nickname) — not for validation errors. */
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-xs uppercase tracking-wider text-tal-plum-soft mb-1">
        {label}
      </div>
      {children}
      {hint && (
        <div className="mt-1 text-xs text-tal-plum-soft leading-snug">
          {hint}
        </div>
      )}
    </label>
  );
}

function MemberKindOption({
  value,
  current,
  onSelect,
  label,
  tooltip,
}: {
  value: MemberKind;
  current: MemberKind;
  onSelect: (v: MemberKind) => void;
  label: string;
  tooltip: string;
}) {
  const active = current === value;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onSelect(value)}
        aria-pressed={active}
        className={
          "w-full h-11 rounded-xl border text-sm font-medium transition-all " +
          (active
            ? "border-tal-plum bg-tal-plum text-white shadow-sm"
            : "border-tal-line bg-white text-tal-plum hover:bg-tal-cream-soft")
        }
      >
        {label}
      </button>
      {/* Info (i) icon in the top-right corner — tap/hover to see explanation.
          Native title="" for keyboard/hover; the visible pill icon nudges
          users to notice it exists. */}
      <span
        tabIndex={0}
        role="button"
        aria-label={`What is ${label}?`}
        title={tooltip}
        onClick={(e) => e.stopPropagation()}
        className={
          "absolute -top-1.5 -right-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold cursor-help ring-2 ring-white select-none " +
          (active
            ? "bg-white text-tal-plum"
            : "bg-tal-plum text-white")
        }
      >
        i
      </span>
    </div>
  );
}
