import type { NextConfig } from "next";

// Env vars live in the monorepo root .env, shared with the worker and drizzle-kit.
try {
  process.loadEnvFile("../../.env");
} catch {
  // No root .env (e.g. on Vercel) — rely on the platform's env vars.
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  transpilePackages: ["@ferrel/db", "@ferrel/pricing", "@ferrel/queues", "@ferrel/storage"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
