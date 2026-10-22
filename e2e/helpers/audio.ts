/** A real PCM WAV file (silence): 44-byte header + `seconds` of 8 kHz 16-bit mono. 1 s = 16,044 bytes. */
export function makeWav(seconds = 1, rate = 8000): Buffer {
  const data = rate * 2 * seconds;
  const b = Buffer.alloc(44 + data);
  b.write("RIFF", 0);
  b.writeUInt32LE(36 + data, 4);
  b.write("WAVE", 8);
  b.write("fmt ", 12);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(data, 40);
  return b;
}

/** Enough of an MP3 (ID3 header) to pass the byte-signature check. */
export const minimalMp3 = (): Buffer => Buffer.concat([Buffer.from("ID3"), Buffer.from([4, 0, 0, 0, 0, 0, 0]), Buffer.alloc(3000)]);
