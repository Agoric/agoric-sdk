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
  try {
    return JSON.parse(jsonText as string);
  } catch (cause) {
    throw Error(`${label} must be valid JSON`, { cause });
  }
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
