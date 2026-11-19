/*
 * Terms of Use body copy — the single source of truth, rendered by the /terms
 * page and the in-app consent dialog. The wording is the lawyers' approved
 * document (lib/legal/terms.ts, generated from the Word file).
 *
 * TERMS_EFFECTIVE: accounts that accepted an earlier version are asked to
 * accept again (see the app layout's LegalConsentGate).
 */
import { LegalDocument } from "./LegalDocument";
import { TERMS_BLOCKS } from "@/lib/legal/terms";

export const TERMS_LAST_UPDATED = "19 November 2026";
export const TERMS_EFFECTIVE = "2026-11-19";

export function TermsContent() {
  return <LegalDocument blocks={TERMS_BLOCKS} entity="The Adulting Life Pty Ltd ACN 703 784 034" />;
}
