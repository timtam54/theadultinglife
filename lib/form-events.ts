// Browser events between a folder page's tools and its form.

/** Start a new (unsaved) entry pre-filled with these answers — e.g. the loan
 *  calculator's figures. The person checks it and presses Save. */
export const NEW_ENTRY_EVENT = "tal:new-entry";

export interface NewEntryDetail {
  subcategoryId: string;
  answers: Record<string, string>;
}

export function startPrefilledEntry(detail: NewEntryDetail) {
  window.dispatchEvent(new CustomEvent<NewEntryDetail>(NEW_ENTRY_EVENT, { detail }));
}
