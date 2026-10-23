// An illustrative ad campaign used on the homepage and the sign-in panel.
// Not real data, and always labelled as an example. No prices: rates aren't
// decided yet (PRODUCT.md question 15). Shares are basis points (100% = 10,000),
// like real splits (decision 019).
export const EXAMPLE = {
  views: 120_000,
  avgSecondsWatched: 9,
  contributors: [
    { role: "Producer", shareBps: 5_000 },
    { role: "Vocalist", shareBps: 3_000 },
    { role: "Writer", shareBps: 2_000 },
  ],
} as const;

/** views × seconds watched */
export const exampleExposureSeconds = EXAMPLE.views * EXAMPLE.avgSecondsWatched;
