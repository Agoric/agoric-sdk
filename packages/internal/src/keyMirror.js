// @ts-check

const { freeze, entries } = Object;

/**
 * @template {Record<string, string | null> & Record<Exclude<PropertyKey, string>, never>} Init
 * @typedef {{ readonly [K in keyof Init]: K }} KeyMirrorResult
 */

/**
 * Mirror the keys of an object to string values that match the key names. This
 * works well to define a TypeScript enum type compatible with erasable syntax:
 *
 *    `@enum {(typeof MyEnum)[keyof typeof MyEnum]}`
 *
 * The provided record must only map property names to either `null` or the
 * property name itself. The returned object has identical keys whose values are
 * the string form of the key.
 *
 * @template {Record<string, string | null> & Record<Exclude<PropertyKey, string>, never>} Init
 * @param {Init & { readonly [K in keyof Init]: Init[K] extends null ? null : K }} record
 * @returns {KeyMirrorResult<Init>}
 */
export const keyMirror = record => {
  if (record === null || typeof record !== 'object') {
    throw TypeError('keyMirror expects a record of string keys.');
  }

  /** @type {Record<string, string>} */
  const mirrored = {
    // @ts-expect-error Record confused by null prototype
    __proto__: null,
  };
  for (const [key, value] of entries(record)) {
    if (value !== null && value !== key) {
      throw TypeError(
        `Value for key "${key}" must be null or the key string; got ${String(value)}.`,
      );
    }
    mirrored[key] = key;
  }
  return /** @type {KeyMirrorResult<Init>} */ (freeze(mirrored));
};

freeze(keyMirror);
