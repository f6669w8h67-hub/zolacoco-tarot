// One place for Zola's LINE contact details, so a changed link is a one-line edit.
// Owner-confirmed values only; see the PR description before changing them.

/** Short link that opens the Zolacoco LINE Official Account (works on phone and desktop). */
export const ZOLA_LINE_URL = "https://lin.ee/tchILJk";

/** LINE ID of the same Official Account, used to open the chat with a message already typed. */
export const ZOLA_LINE_ID = "@903ijdgr";

/**
 * Opens the Official Account chat with `text` already in the input box (LINE URL scheme).
 * The member still has to press send, so nothing is sent on their behalf.
 */
export function lineMessageUrl(text: string) {
  return `https://line.me/R/oaMessage/${encodeURIComponent(ZOLA_LINE_ID)}/?${encodeURIComponent(text)}`;
}
