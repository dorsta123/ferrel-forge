/** True if `work` succeeds within `ms`; false if it fails or takes longer. Never throws. */
export async function within(ms: number, work: Promise<unknown>): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<false>((resolve) => {
    timer = setTimeout(() => resolve(false), ms);
  });
  try {
    return await Promise.race([work.then(() => true as const, () => false as const), timeout]);
  } finally {
    clearTimeout(timer);
  }
}
