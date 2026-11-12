// Licensing choices (phase 5 part 1). Shared by the database checks, the server and the browser.

export const AD_PLATFORMS = ["instagram", "tiktok", "google"] as const;
export type AdPlatform = (typeof AD_PLATFORMS)[number];
export const AD_PLATFORM_LABELS: Record<AdPlatform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  google: "Google / YouTube",
};

export const LICENSE_TERM_DAYS = [30, 90, 365] as const;
export type LicenseTermDays = (typeof LICENSE_TERM_DAYS)[number];

/** A starter list of major cities; real market data per city comes with the pricing model (phase 8). */
export const CITIES = [
  { code: "new-york", name: "New York", country: "US" },
  { code: "los-angeles", name: "Los Angeles", country: "US" },
  { code: "chicago", name: "Chicago", country: "US" },
  { code: "toronto", name: "Toronto", country: "CA" },
  { code: "mexico-city", name: "Mexico City", country: "MX" },
  { code: "sao-paulo", name: "São Paulo", country: "BR" },
  { code: "buenos-aires", name: "Buenos Aires", country: "AR" },
  { code: "london", name: "London", country: "GB" },
  { code: "paris", name: "Paris", country: "FR" },
  { code: "berlin", name: "Berlin", country: "DE" },
  { code: "madrid", name: "Madrid", country: "ES" },
  { code: "lagos", name: "Lagos", country: "NG" },
  { code: "johannesburg", name: "Johannesburg", country: "ZA" },
  { code: "dubai", name: "Dubai", country: "AE" },
  { code: "mumbai", name: "Mumbai", country: "IN" },
  { code: "delhi", name: "Delhi", country: "IN" },
  { code: "singapore", name: "Singapore", country: "SG" },
  { code: "tokyo", name: "Tokyo", country: "JP" },
  { code: "seoul", name: "Seoul", country: "KR" },
  { code: "sydney", name: "Sydney", country: "AU" },
] as const;
export type CityCode = (typeof CITIES)[number]["code"];
export const CITY_CODES = CITIES.map((c) => c.code) as readonly CityCode[];

/** Billing countries (ISO 3166-1 alpha-2). */
export const COUNTRIES = [
  { code: "AE", name: "United Arab Emirates" },
  { code: "AR", name: "Argentina" },
  { code: "AU", name: "Australia" },
  { code: "BR", name: "Brazil" },
  { code: "CA", name: "Canada" },
  { code: "DE", name: "Germany" },
  { code: "ES", name: "Spain" },
  { code: "FR", name: "France" },
  { code: "GB", name: "United Kingdom" },
  { code: "IE", name: "Ireland" },
  { code: "IN", name: "India" },
  { code: "IT", name: "Italy" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "MX", name: "Mexico" },
  { code: "NG", name: "Nigeria" },
  { code: "NL", name: "Netherlands" },
  { code: "NZ", name: "New Zealand" },
  { code: "SE", name: "Sweden" },
  { code: "SG", name: "Singapore" },
  { code: "US", name: "United States" },
  { code: "ZA", name: "South Africa" },
] as const;
export type CountryCode = (typeof COUNTRIES)[number]["code"];
export const COUNTRY_CODES = COUNTRIES.map((c) => c.code) as readonly CountryCode[];

export const LICENSING_LIMITS = {
  companyNameMax: 100,
  citiesMax: CITIES.length,
} as const;

/**
 * The standard license, in plain English (PRODUCT.md question 5). Each license stores the
 * version it was agreed under; a change of wording gets a new version.
 */
export const LICENSE_TERMS_VERSION = "2026-11-13";
export const LICENSE_TERMS = [
  "You may use this track in paid ads on the platforms you chose, shown in the cities you chose, for the license term.",
  "You may trim, loop and fade it to fit your ads.",
  "You may not remix it, use it outside your ads, sell it, or pass this license to anyone else.",
  "You pay monthly for the exposure your ads get (views × seconds watched) at the rate locked below. During testing no real money moves.",
  "The license ends on its end date.",
] as const;
