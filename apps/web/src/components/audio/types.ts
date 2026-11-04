/** What the preview player needs: public by design (decision 028), never the master's location. */
export type PreviewInfo = {
  /** The public MP3 address. */
  url: string;
  durationMs: number;
  /** Where in the song the preview starts, and how long it is. */
  startMs: number;
  lengthMs: number;
  /** The song's 200 bars, 0–1000 (decision 025). */
  waveform: number[];
};
