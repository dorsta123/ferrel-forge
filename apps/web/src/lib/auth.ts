import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { accounts, db, sessions, users, verifications } from "@ferrel/db";
import { displayNameError, normalizeDisplayName } from "@/lib/display-name";

function checkedName(name: unknown): string {
  const normalized = normalizeDisplayName(typeof name === "string" ? name : "");
  const error = displayNameError(normalized);
  if (error) throw new APIError("BAD_REQUEST", { message: error, code: "INVALID_NAME" });
  return normalized;
}

// Server-side auth. Reads BETTER_AUTH_SECRET and BETTER_AUTH_URL from the root .env.
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
    schema: { users, sessions, accounts, verifications },
  }),
  advanced: { database: { generateId: "uuid" } },
  emailAndPassword: { enabled: true },
  // The sign-up and /update-user endpoints accept any name and image, so validate
  // here, where every write passes. `image` is always dropped until avatar
  // uploads exist: an unchecked URL could become XSS or a tracking pixel.
  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({ data: { ...user, name: checkedName(user.name), image: null } }),
      },
      update: {
        // Better Auth merges the returned data over the request ({ ...request, ...data }),
        // so fields must be overwritten here; omitting a key leaves the request's value.
        before: async (data) => ({
          data: {
            image: null,
            // `name` is undefined when the request didn't change it.
            ...(data.name !== undefined && { name: checkedName(data.name) }),
          },
        }),
      },
    },
  },
  // Lets server actions set auth cookies. Must stay the last plugin.
  plugins: [nextCookies()],
});
