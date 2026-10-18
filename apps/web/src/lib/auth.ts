import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { accounts, db, sessions, users, verifications } from "@ferrel/db";

// Server-side auth. Reads BETTER_AUTH_SECRET and BETTER_AUTH_URL from the root .env.
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
    schema: { users, sessions, accounts, verifications },
  }),
  advanced: { database: { generateId: "uuid" } },
  emailAndPassword: { enabled: true },
  // Lets server actions set auth cookies. Must stay the last plugin.
  plugins: [nextCookies()],
});
