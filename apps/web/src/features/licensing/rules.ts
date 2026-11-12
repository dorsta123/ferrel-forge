// License request rules. Pure: the form uses them for instant feedback and the service as the
// real check; the database repeats them as a backstop (licenses and billing_profiles checks).
import {
  AD_PLATFORMS,
  CITY_CODES,
  COUNTRY_CODES,
  LICENSE_TERM_DAYS,
  LICENSING_LIMITS as L,
  type AdPlatform,
  type CityCode,
  type CountryCode,
  type LicenseTermDays,
} from "@ferrel/db/constants";

/** Raw input, as the form sends it. */
export type LicenseFormValues = {
  platforms: string[];
  cities: string[];
  term: string;
  companyName: string;
  country: string;
  agreed: boolean;
};

export type LicenseRequest = {
  platforms: AdPlatform[];
  cities: CityCode[];
  termDays: LicenseTermDays;
  /** Only when the account has no billing details yet. */
  billing: { companyName: string; country: CountryCode } | null;
};

export type LicenseField = "platforms" | "cities" | "term" | "companyName" | "country" | "agreed";
export type LicenseErrors = Partial<Record<LicenseField, string>>;
export type LicenseCheck = { ok: true; value: LicenseRequest } | { ok: false; errors: LicenseErrors };

const CONTROL = /[\u0000-\u001f\u007f]/;

export function validateLicenseRequest(input: LicenseFormValues, { needsBilling }: { needsBilling: boolean }): LicenseCheck {
  const errors: LicenseErrors = {};

  // Keep the lists' own order and drop duplicates, so the same choice is always stored the same way.
  const platforms = AD_PLATFORMS.filter((p) => input.platforms.includes(p));
  if (platforms.length === 0 || input.platforms.some((p) => !(AD_PLATFORMS as readonly string[]).includes(p))) {
    errors.platforms = "Choose at least one platform: Instagram, TikTok or Google / YouTube.";
  }

  const cities = CITY_CODES.filter((c) => input.cities.includes(c));
  if (cities.length === 0 || input.cities.some((c) => !(CITY_CODES as readonly string[]).includes(c))) {
    errors.cities = "Choose at least one city from the list.";
  }

  const termDays = Number(input.term) as LicenseTermDays;
  if (!LICENSE_TERM_DAYS.includes(termDays)) errors.term = "Choose 30, 90 or 365 days.";

  if (input.agreed !== true) errors.agreed = "Please agree to the license terms.";

  let billing: LicenseRequest["billing"] = null;
  if (needsBilling) {
    const companyName = input.companyName.normalize("NFC").trim().replace(/\s+/g, " ");
    if (!companyName) errors.companyName = "Enter the company or brand the ads are for.";
    else if (companyName.length > L.companyNameMax) errors.companyName = `Keep it under ${L.companyNameMax} characters.`;
    else if (CONTROL.test(companyName)) errors.companyName = "The name contains characters that aren't allowed.";

    const country = input.country as CountryCode;
    if (!COUNTRY_CODES.includes(country)) errors.country = "Choose your billing country.";
    billing = { companyName, country };
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { platforms, cities, termDays, billing } };
}
