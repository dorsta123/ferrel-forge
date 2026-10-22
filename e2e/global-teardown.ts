import { purgeTestAccounts } from "./helpers/db";

/** Remove everything the tests created, even when tests failed. */
export default async function globalTeardown() {
  await purgeTestAccounts();
}
