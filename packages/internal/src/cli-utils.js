/**
 * Convert a string-keyed object into an array of CLI options, using each key as
 * the name of a GNU-style long option `--${key}`, ignoring each key with an
 * undefined value and converting boolean values into no-argument `--${key}` or
 * `--no-${key}` options.
 *
 * @param {Record<string, undefined | boolean | string | string[]>} record -
 *   e.g. { color: 'blue' }
 * @returns {string[]} - e.g. ['--color', 'blue']
 */
export const toCLIOptions = record =>
  Object.entries(record).flatMap(([key, value]) => {
    if (value === undefined) return [];
    if (value === true) return [`--${key}`];
    if (value === false) return [`--no-${key}`];
    if (Array.isArray(value)) {
      // Represent as a repeated option.
      return value.flatMap(v => [`--${key}`, v]);
    }
    return [`--${key}`, value];
  });
