// Public links to previews (decision 028: the previews bucket is public-read; masters never are).

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const PREVIEW_KEY = new RegExp(`^${UUID}/${UUID}\\.mp3$`);

/**
 * The address browsers play a preview from. PREVIEWS_PUBLIC_URL points at a CDN in a real
 * deployment; by default it's the storage server's previews bucket. Only well-formed preview
 * keys are accepted, so nothing else (a master key, a path) can ever become a public link.
 * Reads the environment on each call (no secrets involved).
 */
export function publicPreviewUrl(key: string): string {
  if (!PREVIEW_KEY.test(key)) throw new Error("Not a preview key.");
  const configured = process.env.PREVIEWS_PUBLIC_URL;
  if (configured && !isHttpUrl(configured)) throw new Error("PREVIEWS_PUBLIC_URL must be an http(s) address.");
  return `${withoutTrailingSlash(configured || defaultBase())}/${key}`;
}

function defaultBase(): string {
  const { S3_ENDPOINT: endpoint, S3_BUCKET_PREVIEWS: bucket } = process.env;
  if (!endpoint || !bucket) throw new Error("S3_ENDPOINT and S3_BUCKET_PREVIEWS must be set (see .env.example)");
  // The server's own storage address. Fine for local development; a real deployment sets
  // PREVIEWS_PUBLIC_URL to an https address browsers can reach (decision 031).
  return `${withoutTrailingSlash(endpoint)}/${bucket}`;
}

const withoutTrailingSlash = (url: string) => url.replace(/\/+$/, "");

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}
