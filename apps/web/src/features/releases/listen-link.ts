// The optional "Listen to the full song" link (decision 032). Pure: the form checks it
// instantly, the server checks it for real, and the database repeats the rule.
import { LISTEN_HOSTS, LISTEN_URL_MAX, type ListenHost } from "@ferrel/db/constants";

export type ListenCheck = { ok: true; value: string | null } | { ok: false; error: string };

const REFUSED = "Paste a link to the song on YouTube, Spotify or SoundCloud (https://…).";
const WHITESPACE_OR_CONTROL = /[\s\u0000-\u001f\u007f]/;

/** "" → no link; otherwise an https link to one of the allowed sites, with a path, cleaned up. */
export function checkListenUrl(input: string): ListenCheck {
  const raw = input.trim();
  if (!raw) return { ok: true, value: null };
  if (WHITESPACE_OR_CONTROL.test(raw)) return { ok: false, error: REFUSED };

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: REFUSED };
  }
  const allowed =
    url.protocol === "https:" &&
    url.username === "" &&
    url.password === "" &&
    url.port === "" &&
    Object.hasOwn(LISTEN_HOSTS, url.hostname) &&
    url.pathname.length > 1;
  if (!allowed) return { ok: false, error: REFUSED };

  const value = url.href; // lowercased host, standard form
  if (value.length > LISTEN_URL_MAX) return { ok: false, error: `Keep the link under ${LISTEN_URL_MAX} characters.` };
  return { ok: true, value };
}

/** "YouTube", "Spotify" or "SoundCloud", for the button's label. */
export function listenPlatform(url: string): string {
  return LISTEN_HOSTS[new URL(url).hostname as ListenHost] ?? "the web";
}
