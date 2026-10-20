import type { AudioFormat } from "@ferrel/db/constants";

// Shapes passed between the Server Actions and the browser. No server imports here.

export type RequestUploadResult =
  | { ok: true; uploadUrl: string; key: string; contentType: string }
  | { ok: false; error: string };

export type ConfirmUploadResult =
  | { ok: true; format: AudioFormat; sizeBytes: number }
  | { ok: false; error: string };

export type CurrentAudio = { format: AudioFormat; sizeBytes: number } | null;
