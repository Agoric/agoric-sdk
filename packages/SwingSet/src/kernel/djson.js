/**
 * djson is a drop-in replacement for the standard JSON class.  It presents the
 * same API as JSON but serializes to a canonical representation so that the
 * JSON strings representing equivalent objects will compare as equal.
 */

/**
 * Replacer function for JSON.stringify.  Replaces objects with new objects
 * with the same properties but added in sorted order so they'll be stringified
 * in sorted order.
 *
 * @param {any} _
 * @param {any} val
 */
const replacer = (_, val) => {
  if (typeof val === 'object') {
    const sortedObject = {};
    const names = Array.from(Object.getOwnPropertyNames(val));
    names.sort();
    for (const name of names) {
      sortedObject[name] = val[name];
    }
    return sortedObject;
  }
  return val;
};

/**
 * Work-alike to JSON.stringify, but serializes object properties sorted
 * lexicographically by key string.
 *
 * @param {any} val
 */
const stringify = val => JSON.stringify(val, replacer);

/**
 * Equivalent to JSON.parse, provided so that djson may be used as a drop-in
 * replacement for the standard JSON class.
 *
 * @param {string} s
 */
const parse = s => JSON.parse(s);

export default { stringify, parse };
