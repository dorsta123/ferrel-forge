import { describe, expect, it } from "vitest";
import { checkAction, releaseLocks, visibleActions, type ReleaseFacts } from "./status";

const draft: ReleaseFacts = { status: "draft", hasAudio: true, everPublished: false };
const live: ReleaseFacts = { status: "published", hasAudio: true, everPublished: true };
const archived: ReleaseFacts = { ...live, status: "archived" };

describe("checkAction", () => {
  it("publishes a draft with audio", () => {
    expect(checkAction(draft, "publish").ok).toBe(true);
  });

  it("refuses to publish without audio", () => {
    expect(checkAction({ ...draft, hasAudio: false }, "publish")).toEqual({ ok: false, error: "Upload the audio file before publishing." });
  });

  it("unpublishes and archives published releases only", () => {
    expect(checkAction(live, "unpublish").ok).toBe(true);
    expect(checkAction(live, "archive").ok).toBe(true);
    expect(checkAction(draft, "unpublish").ok).toBe(false);
    expect(checkAction(draft, "archive").ok).toBe(false);
  });

  it("deletes drafts only, including ones that were published before", () => {
    expect(checkAction(draft, "delete").ok).toBe(true);
    expect(checkAction({ ...draft, everPublished: true }, "delete").ok).toBe(true);
    expect(checkAction(live, "delete").ok).toBe(false);
  });

  it("treats archived as final", () => {
    for (const action of ["publish", "unpublish", "archive", "delete"] as const) {
      expect(checkAction(archived, action).ok).toBe(false);
    }
  });
});

describe("visibleActions", () => {
  it("matches the lifecycle", () => {
    expect(visibleActions(draft)).toEqual(["publish", "delete"]);
    expect(visibleActions(live)).toEqual(["unpublish", "archive"]);
    expect(visibleActions(archived)).toEqual([]);
  });

  it("only shows actions the rules allow (or that just need audio)", () => {
    for (const facts of [draft, live, archived]) {
      for (const action of visibleActions(facts)) expect(checkAction(facts, action).ok).toBe(true);
    }
  });
});

describe("releaseLocks", () => {
  it("locks the URL after the first publish, even back in draft", () => {
    expect(releaseLocks(draft).slug).toBe(false);
    expect(releaseLocks({ ...draft, everPublished: true }).slug).toBe(true);
  });

  it("makes archived releases read-only", () => {
    expect(releaseLocks(archived).readOnly).toBe(true);
    expect(releaseLocks(live).readOnly).toBe(false);
  });
});
