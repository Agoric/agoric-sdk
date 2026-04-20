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
  alertIntervalMs?: number;
};

export type SubmitWithRetryOpts = {
  log: (...args: unknown[]) => void;
  setTimeout: typeof globalThis.setTimeout;
  now: () => number;
  /**
   * Stable code prefixed to a log line on the first failure and then at most
   * once per `alertIntervalMs` while the submission is stuck. Ops alerting
   * filters match on this code.
   */
  errorCode: string;
  signal?: AbortSignal;
  policy?: RetryPolicy;
};

const sleepOrAbort = (
  ms: number,
  setTimeout: typeof globalThis.setTimeout,
  signal?: AbortSignal,
): Promise<void> =>
  new Promise(resolve => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    const timeoutId = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timeoutId);
      resolve();
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });

export const submitWithRetry = async <T>(
  label: string,
  thunk: () => Promise<T>,
  {
    log,
    setTimeout,
    now,
    errorCode,
    signal,
    policy: {
      initialDelayMs = DEFAULT_INITIAL_DELAY_MS,
      maxDelayMs = DEFAULT_MAX_DELAY_MS,
      alertIntervalMs = DEFAULT_ALERT_INTERVAL_MS,
    } = {},
  }: SubmitWithRetryOpts,
): Promise<T | undefined> => {
  const start = now();
  // Initialize in the past so the first failure triggers an alert.
  let lastAlertAt = start - alertIntervalMs;
  let delay = initialDelayMs;
  let attempt = 0;

  await null;
  while (true) {
    if (signal?.aborted) {
      log(`${label} aborted before attempt ${attempt + 1}`);
      return undefined;
    }

    attempt += 1;
    try {
      const result = await thunk();
      if (attempt > 1) {
        log(`${label} succeeded after ${attempt} attempts`);
      }
      return result;
    } catch (err) {
      const elapsedMs = now() - start;
      const shouldAlert = now() - lastAlertAt >= alertIntervalMs;
      const prefix = shouldAlert ? `[${errorCode}] ` : '';
      log(
        `${prefix}${label} attempt ${attempt} failed after ${elapsedMs}ms, retrying in ${delay}ms`,
        err,
      );
      if (shouldAlert) lastAlertAt = now();

      await sleepOrAbort(delay, setTimeout, signal);
      delay = Math.min(delay * 2, maxDelayMs);
    }
  }
};
harden(submitWithRetry);
