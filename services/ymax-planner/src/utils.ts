/**
 * @file Utility functions that are compatible with but not dependent upon a
 *   hardened environment.
 */

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
