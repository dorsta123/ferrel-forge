import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";

/** SHA-256 of a file, streamed (the FFmpeg binary is ~80 MB). */
export function sha256File(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    createReadStream(path)
      .on("data", (chunk) => hash.update(chunk))
      .on("end", () => resolve(hash.digest("hex")))
      .on("error", reject);
  });
}
