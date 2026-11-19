/*
 * Privacy Policy body copy — the single source of truth, rendered by the
 * /privacy page and the in-app consent dialog. The wording is the lawyers'
 * approved document (lib/legal/privacy.ts, generated from the Word file).
 *
 * PRIVACY_EFFECTIVE: accounts that accepted an earlier version are asked to
 * accept again (see the app layout's LegalConsentGate).
 */
import { LegalDocument } from "./LegalDocument";
import { PRIVACY_BLOCKS } from "@/lib/legal/privacy";

export const PRIVACY_LAST_UPDATED = "19 November 2026";
export const PRIVACY_EFFECTIVE = "2026-11-19";

export function PrivacyContent() {
  return <LegalDocument blocks={PRIVACY_BLOCKS} entity="The Adulting Life Pty Ltd ACN 703 784 034" />;
}
