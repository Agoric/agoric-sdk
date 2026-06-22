/**
 * @file Utility functions that are compatible with but not dependent upon a
 *   hardened environment.
 */

import { typedEntries } from '@agoric/internal/src/js-utils.js';

const { hasOwn } = Object;

export const getOwn = <O, K extends PropertyKey>(
  obj: O,
  key: K,
): K extends keyof O ? O[K] : undefined =>
  // @ts-expect-error TS doesn't let `hasOwn(obj, key)` support `obj[key]`.
  hasOwn(obj, key) ? obj[key] : undefined;

export const makeNowISO = (now: typeof Date.now): (() => string) => {
  const nowISO = () => new Date(now()).toISOString();
  return nowISO;
};

export class BlockCalculator {
  #blockTimeRange = 0;

  #blockHeightRange = 0n;

  #blockHistory = [] as Array<{ blockHeight: bigint; blockTimeMs: number }>;

  get meanBlockTimeMs() {
    return this.#blockHeightRange > 0n
      ? Number(this.#blockTimeRange) / Number(this.#blockHeightRange)
      : 0;
  }

  timeMsAt(index: number, dflt = 0) {
    return this.#blockHistory.at(index)?.blockTimeMs ?? dflt;
  }

  heightAt(index: number, dflt = 0n) {
    return this.#blockHistory.at(index)?.blockHeight ?? dflt;
  }

  append(blockHeight: bigint, blockTimeMs: number) {
    this.#blockHistory.push(Object.freeze({ blockHeight, blockTimeMs }));
    this.#blockTimeRange = this.timeMsAt(-1) - this.timeMsAt(0);
    this.#blockHeightRange = this.heightAt(-1) - this.heightAt(0);
  }

  prune(maxRangeMs: number) {
    while (this.timeMsAt(-1) - this.timeMsAt(0) > maxRangeMs) {
      const removed = this.#blockHistory.shift();
      if (!removed) break;
    }
    this.#blockTimeRange = this.timeMsAt(-1) - this.timeMsAt(0);
    this.#blockHeightRange = this.heightAt(-1) - this.heightAt(0);
  }

  heightForTime(targetTimeMs: number) {
    if (targetTimeMs < this.timeMsAt(0)) {
      // Extrapolate based on the mean block time if the target time is older
      // than our window.
      const mean = this.meanBlockTimeMs;
      if (!(mean > 0 && Number.isFinite(mean))) return this.heightAt(0);
      const deltaTimeMs = this.timeMsAt(0) - targetTimeMs;
      return this.heightAt(0) - BigInt(Math.floor(deltaTimeMs / mean));
    }

    const targetEntry = this.#blockHistory.findLast(
      ({ blockTimeMs }) => blockTimeMs <= targetTimeMs,
    );
    return targetEntry ? targetEntry.blockHeight : this.heightAt(0);
  }
}

/**
 * Parse the contents of a GRAPHQL_ENDPOINTS environment variable.
 * @see {@link ../README.md}
 */
export const parseGraphqlEndpoints = (
  jsonText: string,
  label: string,
): Record<`api-${string}`, string[]> => {
  const type = typeof jsonText;
  if (type !== 'string') throw Error(`${label} is required`);
  const parsed = (() => {
    try {
      return JSON.parse(jsonText as string);
    } catch (cause) {
      throw Error(`${label} must be valid JSON`, { cause });
    }
  })();
  if (!parsed || typeof parsed !== 'object') {
    throw Error(`${label} must encode a string-keyed record`);
  }
  for (const [dirname, urls] of Object.entries(parsed)) {
    if (!dirname.startsWith('api-')) {
      throw Error(`Each ${label} key must start with "api-"`);
    }
    if (
      !Array.isArray(urls) ||
      !urls.length ||
      !urls.every(url => URL.canParse(url))
    ) {
      throw Error(
        `${label}[${JSON.stringify(dirname)}] must be a non-empty array of URLs`,
      );
    }
  }
  return parsed;
};

/**
 * Treat a source object as a one-to-one dictionary, returning the value
 * associated with the provided key or throwing an error if there is no such own
 * property.
 */
export const lookupValueForKey = <K extends string, V>(
  source: Partial<Record<K, V>>,
  key: K,
): V => {
  const value = getOwn(source, key);
  if (value === undefined && !hasOwn(source, key)) {
    throw Error(`no value for key: ${key}`);
  }
  return value as V;
};

/**
 * Treat a source object as a one-to-one dictionary, returning the key
 * associated with the provided value or throwing an error if there is no such
 * own property.
 * This allows the same source object to be used for translation in both
 * directions.
 */
export const lookupKeyForValue = <K extends string, V>(
  source: Partial<Record<K, V>>,
  value: V,
): K => {
  const entry = typedEntries(source).find(([_k, v]) => v === value);
  if (entry === undefined) {
    throw Error(`no key for value: ${value}`);
  }
  return entry[0] as K;
};
