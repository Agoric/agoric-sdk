// @ts-check
// @jessie-check
/**
 * @file Pure JavaScript utility functions that are compatible with but not
 *   dependent upon a hardened environment.
 */

export const logLevels = /** @type {const} */ ([
  'debug',
  'log',
  'info',
  'warn',
  'error',
]);
Object.freeze(logLevels);

/** @typedef {(typeof logLevels)[keyof logLevels & number]} LogLevel */

/** @typedef {Pick<Console, LogLevel>} LimitedConsole */

const { defineProperty, entries, fromEntries } = Object;

/**
 * Deep-copy a value by round-tripping it through JSON (which drops
 * function/symbol/undefined values and properties that are non-enumerable
 * and/or symbol-keyed, and rejects bigint values).
 *
 * @template T
 * @param {T} value
 * @returns {T}
 */
export const deepCopyJsonable = value => JSON.parse(JSON.stringify(value));

/**
 * @param {any} value
 * @param {string | undefined} name
 * @param {object | undefined} container
 * @param {(value: any, name: string, record: object) => any} mapper
 * @returns {any}
 */
const deepMapObjectInternal = (value, name, container, mapper) => {
  if (container && typeof name === 'string') {
    const mapped = mapper(value, name, container);
    if (mapped !== value) {
      return mapped;
    }
  }

  if (typeof value !== 'object' || !value) {
    return value;
  }

  let wasMapped = false;
  const mappedEntries = Object.entries(value).map(([innerName, innerValue]) => {
    const mappedInnerValue = deepMapObjectInternal(
      innerValue,
      innerName,
      value,
      mapper,
    );
    wasMapped ||= mappedInnerValue !== innerValue;
    return [innerName, mappedInnerValue];
  });

  return wasMapped ? Object.fromEntries(mappedEntries) : value;
};

/**
 * Recursively traverses a record object structure, calling a mapper function
 * for each enumerable string-keyed property and returning a record composed of
 * the results. If none of the values are changed, the original object is
 * returned, maintaining its identity.
 *
 * When the property value is an object, it is sent to the mapper like any other
 * value, and then recursively traversed unless replaced with a distinct value.
 *
 * @param {object} obj
 * @param {(value: any, name: string, record: object) => any} mapper
 * @returns {object}
 */
export const deepMapObject = (obj, mapper) =>
  deepMapObjectInternal(obj, undefined, undefined, mapper);

/**
 * Explicitly set a function's name, supporting use of arrow functions for which
 * source text doesn't include a name and no initial name is set by
 * NamedEvaluation
 * https://tc39.es/ecma262/multipage/syntax-directed-operations.html#sec-runtime-semantics-namedevaluation
 *
 * `name` is the first parameter for better readability at call sites (e.g.,
 * `return defineName('foo', () => { ... })`).
 *
 * @template {Function} F
 * @param {string} name
 * @param {F} fn
 * @returns {F}
 */
export const defineName = (name, fn) =>
  defineProperty(fn, 'name', { value: name });

/**
 * @template {Record<PropertyKey, any>} O
 * @template V
 * @param {O} obj
 * @param {<K extends keyof O>(value: O[K], key: K) => V} mapFn
 * @returns {{ [K in keyof O]: V }}
 */
export const objectMapMutable = (obj, mapFn) => {
  const newEntries = entries(obj).map(([k, v]) => [k, mapFn(v, k)]);
  return /** @type {{ [K in keyof O]: V }} */ (fromEntries(newEntries));
};

/**
 * Returns a function that uses a millisecond-based current-time capability
 * (such as `performance.now`) to measure execution duration of an async
 * function and report the result in seconds to match our telemetry standard.
 *
 * @param {() => number} currentTimeMillisec
 */
export const makeMeasureSeconds = currentTimeMillisec => {
  /**
   * @template T
   * @param {() => Promise<T>} fn
   * @returns {Promise<{ result: T; duration: number }>}
   */
  const measureSeconds = async fn => {
    const t0 = currentTimeMillisec();
    const result = await fn();
    const durationMillisec = currentTimeMillisec() - t0;
    return { result, duration: durationMillisec / 1000 };
  };
  return measureSeconds;
};
