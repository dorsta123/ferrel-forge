export const PG_UNIQUE_VIOLATION = "23505";

/** Drizzle wraps postgres.js errors; the Postgres code and constraint live on the cause. */
export function pgError(err: unknown): { code?: string; constraint?: string } | null {
  const e = (err as { cause?: unknown })?.cause ?? err;
  if (!e || typeof e !== "object") return null;
  const { code, constraint_name } = e as { code?: string; constraint_name?: string };
  return { code, constraint: constraint_name };
}
