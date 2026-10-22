import { purgeTestAccounts } from "./helpers/db";

/** Start from a clean slate: remove test accounts left by an earlier, interrupted run. */
export default async function globalSetup() {
  await purgeTestAccounts();
}
