"use client";

// Browser side of Face ID / fingerprint unlock (WebAuthn). The device runs
// its own face or fingerprint check; we never see biometric data.

import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  startAuthentication,
  startRegistration,
  WebAuthnError,
} from "@simplewebauthn/browser";

/** True when this device has Face ID / Touch ID / fingerprint / Windows
 *  Hello that a web page can use. */
export async function faceIdAvailable(): Promise<boolean> {
  try {
    return browserSupportsWebAuthn() && (await platformAuthenticatorIsAvailable());
  } catch {
    return false;
  }
}

/** What the person knows it as on this device. */
export function faceIdName(): string {
  if (typeof navigator === "undefined") return "Face ID";
  const ua = navigator.userAgent;
  if (/iPhone|iPad/.test(ua)) return "Face ID";
  if (/Macintosh/.test(ua)) return navigator.maxTouchPoints > 1 ? "Face ID" : "Touch ID";
  if (/Android/.test(ua)) return "face or fingerprint unlock";
  if (/Windows/.test(ua)) return "Windows Hello";
  return "Face ID or fingerprint";
}

type Result = { ok: true } | { ok: false; cancelled: boolean; message: string };

async function postJson(url: string, body?: unknown): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function failure(e: unknown): Result {
  // The person closed the Face ID prompt or it timed out — not an error.
  const cancelled =
    (e instanceof WebAuthnError && e.code === "ERROR_CEREMONY_ABORTED") ||
    (e instanceof Error && (e.name === "NotAllowedError" || e.name === "AbortError"));
  return {
    ok: false,
    cancelled,
    message: cancelled ? "Face check cancelled." : "That didn't work. Try again, or use your PIN.",
  };
}

/** Turn on Face ID for this device (asks the device to confirm it's you). */
export async function turnOnFaceId(): Promise<Result> {
  try {
    const optRes = await postJson("/api/security/face-id/register/options");
    if (!optRes.ok) return { ok: false, cancelled: false, message: "Couldn't start. Try again." };
    const response = await startRegistration({ optionsJSON: await optRes.json() });
    const res = await postJson("/api/security/face-id/register/verify", response);
    if (res.ok) return { ok: true };
    return { ok: false, cancelled: false, message: "Couldn't turn it on. Try again." };
  } catch (e) {
    if (e instanceof WebAuthnError && e.code === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED") {
      return { ok: false, cancelled: false, message: "It's already on for this device." };
    }
    return failure(e);
  }
}

/** Unlock the app lock with Face ID. */
export async function unlockWithFaceId(): Promise<Result> {
  try {
    const optRes = await postJson("/api/security/face-id/unlock/options");
    if (!optRes.ok) return { ok: false, cancelled: false, message: "Couldn't start. Use your PIN." };
    const response = await startAuthentication({ optionsJSON: await optRes.json() });
    const res = await postJson("/api/security/face-id/unlock/verify", response);
    if (res.ok) return { ok: true };
    return { ok: false, cancelled: false, message: "That didn't work. Try again, or use your PIN." };
  } catch (e) {
    return failure(e);
  }
}
