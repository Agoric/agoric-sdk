// @ts-check

const { freeze, keys } = Object;

/**
 * @template {Record<string, string | null>} Init
 * @typedef {{ readonly [K in keyof Init]: K }} KeyMirrorResult
 */

/**
 * Mirror the keys of an object to string values that match the key names.
 *
 * The provided record must only map property names to either `null` or the
 * property name itself. The returned object has identical keys whose values are
 * the string form of the key.
 *
 * @template {Record<string, string | null>} Init
 * @param {Init & { readonly [K in keyof Init]: Init[K] extends null ? null : K }} record
 * @returns {KeyMirrorResult<Init>}
 */
export const keyMirror = record => {
  if (record === null || typeof record !== 'object') {
    throw TypeError('keyMirror expects a record of string keys.');
  }

  /** @type {Record<string, string>} */
  const mirrored = {};
  for (const key of keys(record)) {
    const typedKey = /** @type {keyof Init & string} */ (key);
    const value = record[typedKey];
    const stringValue = /** @type {string | null} */ (value);
    if (stringValue !== null && stringValue !== typedKey) {
      throw TypeError(
        `Value for key "${typedKey}" must be null or the key string; got ${String(value)}.`,
      );
    }
    mirrored[typedKey] = typedKey;
  }

  return /** @type {KeyMirrorResult<Init>} */ (freeze(mirrored));
};

freeze(keyMirror);
