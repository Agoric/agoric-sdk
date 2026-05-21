/**
 * Retry helper for chain submissions (resolver settlements, plan submissions).
 *
 * Unbounded retries with exponential backoff. Every failed attempt is logged,
 * but only the first failure and then one every `alertIntervalMs` carry the
 * caller-supplied `errorCode` prefix — the ops alerting filter matches on that
 * code, so this in-code throttling keeps pages to one per interval while the
 * submission stays stuck.
 *
 * Each retry is a fresh call through the sequencing wallet's queue, so other
 * in-flight submissions interleave normally between attempts.
 */

export const DEFAULT_INITIAL_DELAY_MS = 5 * 1000;
export const DEFAULT_MAX_DELAY_MS = 1 * 60 * 1000;
export const DEFAULT_ALERT_INTERVAL_MS = 5 * 60 * 1000;

export type RetryPolicy = {
  initialDelayMs?: number;
  maxDelayMs?: number;
};

export type RetryCallbackArgs = {
  /** 0 on the first call, 1 after the first retry, etc. */
  retryCount: number;
  /** ms the helper will sleep before the next invocation if this call throws. */
  nextDelayMs: number;
};

export type WithRetriesOpts = {
  setTimeout: typeof globalThis.setTimeout;
  policy?: RetryPolicy;
};

export const withRetries = async <T>(
  callback: (args: RetryCallbackArgs) => Promise<T>,
  {
    setTimeout,
    policy: {
      initialDelayMs = DEFAULT_INITIAL_DELAY_MS,
      maxDelayMs = DEFAULT_MAX_DELAY_MS,
    } = {},
  }: WithRetriesOpts,
): Promise<T> => {
  let delay = initialDelayMs;
  let retryCount = 0;

  await null;
  while (true) {
    try {
      return await callback({ retryCount, nextDelayMs: delay });
    } catch {
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, maxDelayMs);
      retryCount += 1;
    }
  }
};
harden(withRetries);

export type WithRetriesForAlertingPolicy = RetryPolicy & {
  alertIntervalMs?: number;
};

export type WithRetriesForAlertingOpts = {
  log: (...args: unknown[]) => void;
  setTimeout: typeof globalThis.setTimeout;
  now: () => number;
  /**
   * Stable string (e.g. `[CODE]`) prepended to the first failure's log line
   * and then at most once per `alertIntervalMs` while the thunk keeps failing.
   * Ops alerting filters match on this prefix.
   */
  alertingPrefix: string;
  signal?: AbortSignal;
  policy?: WithRetriesForAlertingPolicy;
};

export const withRetriesForAlerting = async <T>(
  label: string,
  thunk: () => Promise<T>,
  {
    log,
    setTimeout,
    now,
    alertingPrefix,
    signal,
    policy: {
      initialDelayMs,
      maxDelayMs,
      alertIntervalMs = DEFAULT_ALERT_INTERVAL_MS,
    } = {},
  }: WithRetriesForAlertingOpts,
): Promise<T | undefined> => {
  const start = now();
  // Initialize in the past so the first failure triggers an alert.
  let lastAlertAt = start - alertIntervalMs;
  return withRetries<T | undefined>(
    async ({ retryCount, nextDelayMs }) => {
      if (signal?.aborted) {
        // We won't make an attempt for this `retryCount`.
        log(`${label} aborted after ${retryCount} attempt(s)`);
        return undefined;
      }
      const attempt = retryCount + 1;
      await null;
      try {
        const result = await thunk();
        if (retryCount > 0) {
          log(`${label} succeeded after ${attempt} attempt(s)`);
        }
        return result;
      } catch (err) {
        const elapsedMs = now() - start;
        const shouldAlert = now() - lastAlertAt >= alertIntervalMs;
        if (shouldAlert) lastAlertAt = now();
        const aborted = signal?.aborted;
        const messageParts = [
          shouldAlert && alertingPrefix,
          label,
          `attempt ${attempt} failed after ${elapsedMs}ms,`,
          aborted ? 'aborting' : `retrying in ${nextDelayMs}ms`,
        ].filter(Boolean);
        log(messageParts.join(' '), err);
        if (aborted) return undefined;
        throw err;
      }
    },
    { setTimeout, policy: { initialDelayMs, maxDelayMs } },
  );
};
harden(withRetriesForAlerting);
