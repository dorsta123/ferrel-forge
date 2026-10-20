// CLI: `pnpm storage:setup` — creates buckets and applies access rules + CORS.
// (The package script is "setup-buckets", not "setup": `pnpm setup` is a pnpm
// built-in that edits the user PATH.)
import { setupBuckets } from "./setup-buckets";

try {
  const reports = await setupBuckets();
  console.table(reports);
  console.log("Storage ready.");
} catch (err) {
  console.error("Storage setup failed:", err instanceof Error ? err.message : err);
  console.error("Is RustFS running? Try `pnpm db:up`.");
  process.exit(1);
}
