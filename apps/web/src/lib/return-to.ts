// Where to send someone after signing in or up (e.g. back to the license page they came from).
// Only paths on this site: anything else would let a crafted link bounce people to another site.

const SAFE_PATH = /^\/(?![/\\])[^\s\\\u0000-\u001f\u007f]*$/;

export function safeReturnTo(value: string | null | undefined): string {
  if (!value || !SAFE_PATH.test(value)) return "/";
  // An encoded "//" could still be read as another site once decoded.
  if (/%2f|%5c/i.test(value.slice(0, 4))) return "/";
  return value;
}
