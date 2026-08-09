/**
 * Hard character-limit truncation for user-supplied strings shown in
 * narrow UI containers (mobile row cells, sidebar cards, activity feeds).
 *
 * CSS ellipsis alone is not enough because grid/flex ancestors sometimes
 * refuse to shrink below their content's intrinsic width, and long
 * unbroken tokens (filenames, IDs) blow past viewport limits before CSS
 * can kick in. This is the belt to that suspenders.
 */
export function truncateForRow(raw: string, max = 30): string {
  if (raw.length <= max) return raw;
  return raw.slice(0, max - 1) + "…";
}
