/**
 * Helpers for automatic retries with exponential backoff.
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
  signal?: AbortSignal;
  policy?: RetryPolicy;
};

/**
 * Invoke a callback until it succeeds, backing off exponentially.
 * The delay between the first failure and the first retry is `initialDelayMs`,
 * and each subsequent delay is doubled and clamped to `maxDelayMs`.
 * Retry status is communicated to the callback as a { retryCount, nextDelay }
 * argument.
 */
export const withRetries = async <T>(
  callback: (args: RetryCallbackArgs) => Promise<T>,
  {
    setTimeout,
    signal,
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
    signal?.throwIfAborted();
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

/**
 * Invoke a thunk until it succeeds, backing off exponentially.
 * The delay between the first failure and the first retry is `initialDelayMs`,
 * and each subsequent delay is doubled and clamped to `maxDelayMs`.
 * Every failed attempt is logged, but only the first failure and then one every
 * `alertIntervalMs` carry the supplied `alertingPrefix`, so that ops alert
 * noise can be reduced by filtering for that prefix.
 */
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
        const t = now();
        const elapsedMs = t - start;
        const shouldAlert = t - lastAlertAt >= alertIntervalMs;
        if (shouldAlert) lastAlertAt = t;
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
