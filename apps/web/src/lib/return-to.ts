// Where to send someone after signing in or up (e.g. back to the license page they came from).
// Only paths on this site: anything else would let a crafted link bounce people to another site.

const SAFE_PATH = /^\/(?![/\\])[^\s\\\u0000-\u001f\u007f]*$/;
const PROBE = "https://return-to.invalid";

export function safeReturnTo(value: string | null | undefined): string {
  if (!value || !SAFE_PATH.test(value)) return "/";
  // Read it the way a browser will: dot segments ("/.//x", "/%2e%2e//x") can resolve to "//host",
  // which a full-page navigation would treat as another site.
  let url: URL;
  try {
    url = new URL(value, PROBE);
  } catch {
    return "/";
  }
  if (url.origin !== PROBE || url.pathname.startsWith("//") || /^\/(%2f|%5c)/i.test(url.pathname)) return "/";
  return url.pathname + url.search + url.hash;
}
