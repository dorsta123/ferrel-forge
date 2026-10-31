/** Wrap `fn` so it runs at most once per `ms`; calls in between are dropped. */
export function onceEvery<A extends unknown[]>(ms: number, fn: (...args: A) => void): (...args: A) => void {
  let last = -Infinity;
  return (...args: A) => {
    const now = Date.now();
    if (now - last < ms) return;
    last = now;
    fn(...args);
  };
}
