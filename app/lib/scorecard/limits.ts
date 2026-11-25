/** Shared input limits (used by both the browser and the API). */

/** Vercel functions accept request bodies up to 4.5 MB; keep uploads under that. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/** Largest PDF we will try to read in the browser when it is too big to upload. */
export const MAX_LOCAL_PDF_BYTES = 60 * 1024 * 1024;

/** Upper bound on rules text sent to the model (~50k tokens). */
export const MAX_RULES_CHARS = 200_000;
