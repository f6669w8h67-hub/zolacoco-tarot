// Only the newest request may write to the screen. Starting a new one (or cancelling) aborts the
// previous fetch and makes its late reply harmless: `isCurrent()` is false once anything newer began.
export function latestRequest() {
  let current = 0;
  let controller: AbortController | null = null;
  return {
    start() {
      controller?.abort();
      controller = new AbortController();
      const id = ++current;
      return { signal: controller.signal, isCurrent: () => id === current };
    },
    cancel() {
      controller?.abort();
      controller = null;
      current += 1;
    },
  };
}
