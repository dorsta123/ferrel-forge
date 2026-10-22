// Storage security: expired and tampered upload links, anonymous access, CORS.
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { bucketId, createUploadUrl, deleteObject, getObjectInfo } from "@ferrel/storage";

const ENDPOINT = process.env.S3_ENDPOINT ?? "http://localhost:9000";
const SITE = process.env.S3_CORS_ORIGINS?.split(",")[0] ?? "http://localhost:3000";
// Real bucket names from settings (they can differ from the logical names "masters"/"previews").
const MASTERS = bucketId("masters");
const PREVIEWS = bucketId("previews");
const BODY = "RIFF0000WAVEdata"; // 16 bytes
const folder = `security-test-${randomUUID()}`;
const key = (name: string) => `${folder}/${name}.wav`;
const signed: string[] = [];

const put = (url: string, body = BODY, type = "audio/wav") => fetch(url, { method: "PUT", body, headers: { "content-type": type } });
async function sign(k: string, expiresIn?: number) {
  signed.push(k);
  return createUploadUrl({ bucket: "masters", key: k, contentType: "audio/wav", contentLength: BODY.length, expiresIn });
}
/** Storage refused the request (403 / 400 / 401). */
const refused = (status: number) => expect([400, 401, 403]).toContain(status);

afterAll(async () => {
  for (const k of signed) await deleteObject("masters", k);
});

describe("signed upload links", () => {
  it("work when untouched (control)", async () => {
    expect((await put(await sign(key("good")))).status).toBe(200);
  });

  it("stop working when expired", async () => {
    const url = await sign(key("expired"), 1);
    await new Promise((r) => setTimeout(r, 2500));
    refused((await put(url)).status);
    expect(await getObjectInfo("masters", key("expired"))).toBeNull();
  });

  describe("refuse tampering", async () => {
    const url = new URL(await sign(key("tamper")));
    const variant = (change: (u: URL) => void) => {
      const u = new URL(url);
      change(u);
      return u.toString();
    };

    it("used for a different file name", async () => {
      refused((await put(variant((u) => (u.pathname = `/${MASTERS}/${folder}/someone-else.wav`)))).status);
      expect(await getObjectInfo("masters", `${folder}/someone-else.wav`)).toBeNull();
    });

    it("used for the public bucket", async () => {
      refused((await put(variant((u) => (u.pathname = u.pathname.replace(`/${MASTERS}/`, `/${PREVIEWS}/`))))).status);
    });

    it("with a longer expiry", async () => {
      refused((await put(variant((u) => u.searchParams.set("X-Amz-Expires", "604800")))).status);
    });

    it("with a different content type or file size", async () => {
      refused((await put(url.toString(), BODY, "text/html")).status);
      refused((await put(url.toString(), BODY + "extra")).status);
    });
  });
});

describe("anonymous access", () => {
  it("can't upload to either bucket", async () => {
    refused((await fetch(`${ENDPOINT}/${MASTERS}/${folder}/anon.wav`, { method: "PUT", body: BODY })).status);
    refused((await fetch(`${ENDPOINT}/${PREVIEWS}/${folder}/anon.mp3`, { method: "PUT", body: BODY })).status);
  });

  it("can't download or delete a master", async () => {
    refused((await fetch(`${ENDPOINT}/${MASTERS}/${key("good")}`)).status);
    refused((await fetch(`${ENDPOINT}/${MASTERS}/${key("good")}`, { method: "DELETE" })).status);
    expect(await getObjectInfo("masters", key("good"))).not.toBeNull();
  });

  it("can't list either bucket", async () => {
    refused((await fetch(`${ENDPOINT}/${MASTERS}/`)).status);
    refused((await fetch(`${ENDPOINT}/${PREVIEWS}/`)).status);
  });
});

describe("CORS", () => {
  const preflight = (origin: string) =>
    fetch(`${ENDPOINT}/${MASTERS}/${key("cors")}`, {
      method: "OPTIONS",
      headers: { origin, "access-control-request-method": "PUT", "access-control-request-headers": "content-type" },
    }).then((r) => r.headers.get("access-control-allow-origin"));

  it("allows uploads from our site only", async () => {
    expect(await preflight(SITE)).toBe(SITE);
    expect([null, ""]).toContain(await preflight("https://evil.example"));
  });
});
