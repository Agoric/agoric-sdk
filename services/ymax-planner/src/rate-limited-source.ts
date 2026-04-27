/**
 * Rate-limited async iterator wrapper.
 *
 * Releases items from `source` at a rate of at most `quota` items per any
 * `windowMs` sliding window, with bursts of up to `quota` allowed at the head
 * of an idle window. Naming follows the IETF `RateLimit` header draft's
 * quota/window vocabulary (q, w) but uses `windowMs` for sub-second precision.
 *
 * Time and timer access are passed in as powers — no ambient clock or
 * `setTimeout`.
 *
 * @see https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/
 */

type RateLimitPolicy = {
  /** Maximum items released per window. */
  quota: number;
  /** Sliding window length in milliseconds. */
  windowMs: number;
};

type RateLimitPowers = {
  delay: (ms: number) => Promise<void>;
  now: () => number;
};

const rateLimitedSource = <T>({
  policy,
  powers,
  source,
}: {
  policy: RateLimitPolicy;
  powers: RateLimitPowers;
  source: Iterable<T> | AsyncIterable<T>;
}) => {
  const { quota, windowMs } = policy;
  const { delay, now } = powers;

  if (!(Number.isInteger(quota) && quota > 0)) {
    throw RangeError('quota must be a positive integer');
  }

  if (!(Number.isFinite(windowMs) && windowMs > 0)) {
    throw RangeError('windowMs must be a positive finite number');
  }

  async function* generate(): AsyncGenerator<T, void, void> {
    const releases: number[] = [];
    for await (const item of source) {
      const t = now();

      let effective = t;

      if (releases.length >= quota) {
        const earliest = releases[releases.length - quota] + windowMs;
        if (earliest > effective) effective = earliest;
      }

      releases.push(effective);

      if (releases.length > quota) {
        releases.splice(0, releases.length - quota);
      }

      const wait = effective - t;

      if (wait) await delay(wait);
      yield item;
    }
  }

  return generate();
};

export default rateLimitedSource;
