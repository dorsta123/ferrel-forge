import { describe, expect, it } from "vitest";
import { validateLicenseRequest, type LicenseFormValues } from "./rules";

const valid: LicenseFormValues = {
  platforms: ["tiktok", "instagram"],
  cities: ["london", "mumbai"],
  term: "90",
  companyName: "",
  country: "",
  agreed: true,
  shownRateMicros: 500_000,
};
const run = (patch: Partial<LicenseFormValues>, needsBilling = false) => validateLicenseRequest({ ...valid, ...patch }, { needsBilling });

describe("validateLicenseRequest", () => {
  it("accepts a valid request, in a stable order, without duplicates", () => {
    expect(run({ platforms: ["tiktok", "instagram", "tiktok"], cities: ["mumbai", "london", "mumbai"] })).toEqual({
      ok: true,
      value: { platforms: ["instagram", "tiktok"], cities: ["london", "mumbai"], termDays: 90, billing: null },
    });
  });

  it("asks for company name and country only when billing details are missing", () => {
    expect(run({}, true)).toMatchObject({ ok: false, errors: { companyName: expect.any(String), country: expect.any(String) } });
    expect(run({ companyName: "  Acme   Sneakers ", country: "GB" }, true)).toMatchObject({
      ok: true,
      value: { billing: { companyName: "Acme Sneakers", country: "GB" } },
    });
  });

  it.each<[string, Partial<LicenseFormValues>, string]>([
    ["no platform", { platforms: [] }, "platforms"],
    ["an unknown platform", { platforms: ["myspace"] }, "platforms"],
    ["no city", { cities: [] }, "cities"],
    ["an unknown city", { cities: ["atlantis"] }, "cities"],
    ["a term that isn't offered", { term: "45" }, "term"],
    ["a term that isn't a number", { term: "forever" }, "term"],
    ["not agreeing to the terms", { agreed: false }, "agreed"],
  ])("refuses %s", (_, patch, field) => {
    const r = run(patch);
    expect(r.ok ? {} : r.errors).toHaveProperty(field);
  });

  it.each<[string, Partial<LicenseFormValues>, string]>([
    ["a blank company name", { companyName: "   ", country: "GB" }, "companyName"],
    ["a company name over 100 characters", { companyName: "a".repeat(101), country: "GB" }, "companyName"],
    ["control characters in the company name", { companyName: "Acme\u0000", country: "GB" }, "companyName"],
    ["an unknown country", { companyName: "Acme", country: "XX" }, "country"],
  ])("refuses billing details with %s", (_, patch, field) => {
    const r = run(patch, true);
    expect(r.ok ? {} : r.errors).toHaveProperty(field);
  });
});
