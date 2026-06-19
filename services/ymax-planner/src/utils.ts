/**
 * @file Utility functions that are compatible with but not dependent upon a
 *   hardened environment.
 */

import { typedEntries } from '@agoric/internal/src/js-utils.js';

const { hasOwn } = Object;
const { apply } = Reflect;

export const getOwn = <O, K extends PropertyKey>(
  obj: O,
  key: K,
): K extends keyof O ? O[K] : undefined =>
  // @ts-expect-error TS doesn't let `hasOwn(obj, key)` support `obj[key]`.
  hasOwn(obj, key) ? obj[key] : undefined;

export const makeExpiringMap = <K, V>(
  ttl: number,
  { now }: { now: () => number },
): Map<K, V> => {
  if (!now) throw TypeError('Missing required power `now`');

  const internalMap = new Map<K, { expiresAt: number; value: V }>();
  const entries = function* entries() {
    for (const [key, { expiresAt, value }] of internalMap.entries()) {
      if (expiresAt > now()) yield [key, value];
    }
  } as () => MapIterator<[K, V]>;
  const set = (key: K, value: V) => {
    internalMap.set(key, { expiresAt: now() + ttl, value });
    return expiringMap;
  };

  const expiringMap: Map<K, V> = {
    [Symbol.toStringTag]: 'ExpiringMap',
    [Symbol.iterator]: entries,
    clear: () => internalMap.clear(),
    delete: key => internalMap.delete(key),
    entries,
    forEach: (fn, receiver = undefined) => {
      internalMap.forEach(({ expiresAt, value }, key) => {
        if (expiresAt > now()) apply(fn, receiver, [value, key, expiringMap]);
      });
    },
    get: key => {
      const found = internalMap.get(key);
      return found && found.expiresAt > now() ? found.value : undefined;
    },
    getOrInsert: (key, value) => {
      const found = internalMap.get(key);
      if (found && found.expiresAt > now()) return found.value;
      set(key, value);
      return value;
    },
    getOrInsertComputed: (key, makeValue) => {
      if (typeof makeValue !== 'function') {
        throw TypeError('Callback must be a function');
      }
      const found = internalMap.get(key);
      if (found && found.expiresAt > now()) return found.value;
      const value = apply(makeValue, undefined, [key]);
      set(key, value);
      return value;
    },
    has: key => {
      const found = internalMap.get(key);
      return !!(found && found.expiresAt > now());
    },
    keys: function* keys() {
      for (const [key] of entries()) yield key;
    } as () => MapIterator<K>,
    set,
    get size() {
      const T = now();
      return [...internalMap.values()].filter(v => v.expiresAt > T).length;
    },
    values: function* values() {
      for (const [, value] of entries()) yield value;
    } as () => MapIterator<V>,
  };
  return expiringMap;
};

export const makeNowISO = (now: typeof Date.now): (() => string) => {
  const nowISO = () => new Date(now()).toISOString();
  return nowISO;
};

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
