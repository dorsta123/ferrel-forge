"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { confirmAudioUpload, requestAudioUpload } from "./actions";
import { checkAudioFile } from "./rules";

export type UploadState =
  | { phase: "idle" }
  | { phase: "preparing"; fileName: string }
  | { phase: "uploading"; fileName: string; progress: number }
  | { phase: "verifying"; fileName: string }
  | { phase: "done"; fileName: string }
  | { phase: "error"; message: string };

/** Sends a file to storage with a signed link (XHR, for progress), then asks the server to verify it. */
export function useAudioUpload(trackId: string) {
  const router = useRouter();
  const [state, setState] = useState<UploadState>({ phase: "idle" });
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const start = useCallback(
    async (file: File) => {
      const check = checkAudioFile(file);
      if (!check.ok) return setState({ phase: "error", message: check.error });

      setState({ phase: "preparing", fileName: file.name });
      const request = await requestAudioUpload(trackId, { name: file.name, size: file.size, type: file.type });
      if (!request.ok) return setState({ phase: "error", message: request.error });

      const uploaded = await putWithProgress(request.uploadUrl, file, request.contentType, xhrRef, (progress) =>
        setState({ phase: "uploading", fileName: file.name, progress }),
      );
      if (uploaded !== "ok") {
        return setState({ phase: "error", message: uploaded === "aborted" ? "Upload cancelled." : "Upload failed. Check your connection and try again." });
      }

      setState({ phase: "verifying", fileName: file.name });
      const confirmed = await confirmAudioUpload(trackId, request.key);
      if (!confirmed.ok) return setState({ phase: "error", message: confirmed.error });

      setState({ phase: "done", fileName: file.name });
      router.refresh(); // show the newly attached file
    },
    [trackId, router],
  );

  const cancel = useCallback(() => xhrRef.current?.abort(), []);
  const reset = useCallback(() => setState({ phase: "idle" }), []);

  return { state, start, cancel, reset };
}

function putWithProgress(
  url: string,
  file: File,
  contentType: string,
  xhrRef: React.RefObject<XMLHttpRequest | null>,
  onProgress: (fraction: number) => void,
): Promise<"ok" | "failed" | "aborted"> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("PUT", url);
    // Must equal the signed content type, or storage rejects the upload.
    xhr.setRequestHeader("content-type", contentType);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300 ? "ok" : "failed");
    xhr.onerror = () => resolve("failed");
    xhr.onabort = () => resolve("aborted");
    onProgress(0);
    xhr.send(file);
  });
}
