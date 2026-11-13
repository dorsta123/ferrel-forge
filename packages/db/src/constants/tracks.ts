// Track domain rules: one source of truth for the database (enums + check
// constraints), server validation, and UI (selects, limits, labels).

export const GENRES = [
  "hip-hop",
  "electronic",
  "lo-fi",
  "pop",
  "rock",
  "rnb",
  "ambient",
  "cinematic",
  "other",
] as const;
export type Genre = (typeof GENRES)[number];

export const GENRE_LABELS: Record<Genre, string> = {
  "hip-hop": "Hip-hop",
  electronic: "Electronic",
  "lo-fi": "Lo-fi",
  pop: "Pop",
  rock: "Rock",
  rnb: "R&B",
  ambient: "Ambient",
  cinematic: "Cinematic",
  other: "Other",
};

// 24 keys, sharps only. "C#m" = C sharp minor.
const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
export const MUSICAL_KEYS = [...NOTES, ...NOTES.map((n) => `${n}m` as const)] as const;
export type MusicalKey = (typeof MUSICAL_KEYS)[number];

export const TRACK_STATUSES = ["draft", "published", "archived"] as const;
export type TrackStatus = (typeof TRACK_STATUSES)[number];

/** Where processing of a track's audio is up to (phase 4). "none" exactly when there is no file. */
export const AUDIO_STATUSES = ["none", "processing", "ready", "failed"] as const;
export type AudioStatus = (typeof AUDIO_STATUSES)[number];

export const AUDIO_FORMATS = ["wav", "mp3", "flac"] as const;
export type AudioFormat = (typeof AUDIO_FORMATS)[number];

/** Content type we sign upload links with and store files as (one per format). */
export const AUDIO_CONTENT_TYPES: Record<AudioFormat, string> = {
  wav: "audio/wav",
  mp3: "audio/mpeg",
  flac: "audio/flac",
};

/** Content types browsers report for each format (they disagree, e.g. audio/x-wav). */
export const AUDIO_BROWSER_TYPES: Record<AudioFormat, readonly string[]> = {
  wav: ["audio/wav", "audio/wave", "audio/x-wav", "audio/vnd.wave"],
  mp3: ["audio/mpeg", "audio/mp3"],
  flac: ["audio/flac", "audio/x-flac"],
};

export const TRACK_LIMITS = {
  titleMax: 100,
  slugMax: 80,
  descriptionMax: 2000,
  bpmMin: 40,
  bpmMax: 250,
  // The artist's base rate per 1,000 exposure-seconds, in micro-dollars (decision 034).
  rateMinMicros: 10_000, // $0.01
  rateMaxMicros: 50_000_000, // $50.00
  rateDefaultMicros: 500_000, // $0.50
  audioMaxBytes: 150 * 1024 * 1024, // 150 MB
  durationMaxMs: 4 * 60 * 60 * 1000, // 4 hours
  audioErrorMax: 500, // the reason shown to the artist when processing fails
  previewMs: 15_000, // previews are 15 s (decision 022)
  waveformBars: 200, // must match PEAK_COUNT in @ferrel/audio
  waveformMax: 1000, // bar heights are whole numbers 0–1000 (0 = silence)
} as const;

/**
 * Sites a "Listen to the full song" link may point to (https only, decision 032). Shared by
 * the browser, the server and the database check, so all three accept exactly the same links.
 */
export const LISTEN_HOSTS = {
  "youtube.com": "YouTube",
  "www.youtube.com": "YouTube",
  "m.youtube.com": "YouTube",
  "music.youtube.com": "YouTube",
  "youtu.be": "YouTube",
  "open.spotify.com": "Spotify",
  "soundcloud.com": "SoundCloud",
  "www.soundcloud.com": "SoundCloud",
  "m.soundcloud.com": "SoundCloud",
} as const;
export type ListenHost = keyof typeof LISTEN_HOSTS;
export const LISTEN_URL_MAX = 300;
