// @ts-check
// @jessie-check
/**
 * @file Pure JavaScript utility functions that are compatible with but not
 *   dependent upon a hardened environment.
 */

const { defineProperty } = Object;

/** For overriding TypeScript inferring the type of `true` as boolean. */
export const TRUE = /** @type {const} */ (true);

/**
 * @typedef {<O extends Record<string, unknown>>(
 *   obj: O,
 * ) => { [K in keyof O]: K extends string ? [K, O[K]] : never }[keyof O][]} TypedEntries
 */
export const typedEntries = /** @type {TypedEntries} */ (Object.entries);

/**
 * @typedef {<
 *   const Entries extends ReadonlyArray<readonly [PropertyKey, unknown]>,
 * >(
 *   entries: Entries,
 * ) => { [Entry in Entries[number] as Entry[0]]: Entry[1] }} FromTypedEntries
 */
export const fromTypedEntries = /** @type {FromTypedEntries} */ (
  Object.fromEntries
);

/**
 * @typedef {<A extends unknown[], V>(
 *   arr: A,
 *   mapper: <K extends number>(el: A[K], idx: K, arr: A) => V,
 * ) => V[]} TypedMap
 */
export const typedMap = /** @type {TypedMap} */ (
  Function.prototype.call.bind(Array.prototype.map)
);

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
 * @template {Record<PropertyKey, unknown>} O
 * @template {string & keyof O} K
 * @template M
 * @param {O[K]} value
 * @param {K | undefined} name
 * @param {O | undefined} container
 * @param {(value: O[K], name: K, record: O) => O[K] | M} mapper
 * @returns {O[K] | M | { [K2 in keyof O[K]]: O[K][K2] | M }}
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
  const valueObj = /** @type {Record<string, unknown>} */ (value);
  /**
   * @type {<T extends typeof value, K2 extends string & keyof T>(
   *   entry: [K2, T[K2]],
   * ) => [K2, T[K2] | M]}
   */
  const mapEntry = ([innerName, innerValue]) => {
    const mappedInnerValue = deepMapObjectInternal(
      innerValue,
      innerName,
      valueObj,
      mapper,
    );
    wasMapped ||= mappedInnerValue !== innerValue;
    return [innerName, /** @type {any} */ (mappedInnerValue)];
  };
  const mappedEntries = typedEntries(valueObj).map(mapEntry);

  if (!wasMapped) {
    return value;
  }

  const mappedObj = fromTypedEntries(mappedEntries);
  return /** @type {any} */ (mappedObj);
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
 * @template {Record<string, unknown>} O
 * @template M
 * @param {O} obj
 * @param {<T extends Record<string, unknown>, K extends string & keyof T>(
 *   value: T[K],
 *   name: K,
 *   record: T,
 * ) => T[K] | M} mapper
 * @returns {O | { [K in keyof O]: K extends string ? O[K] | M : never }}
 */
export const deepMapObject = (obj, mapper) =>
  /** @type {any} */ (deepMapObjectInternal(obj, undefined, undefined, mapper));

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
 * By analogy with how `Array.prototype.map` will map the elements of an array
 * to transformed elements of an array of the same shape, `objectMapMutable`
 * will do likewise for the enumerable string-keyed properties of an object.
 *
 * Unlike endo's `objectMap`, this function returns a non-hardened object.
 *
 * @template {Record<string, unknown>} O
 * @template M
 * @param {O} obj
 * @param {<K extends keyof O>(value: O[K], key: K) => M} mapper
 * @returns {{ [K in keyof O]: K extends string ? M : never }}
 */
export const objectMapMutable = (obj, mapper) => {
  const oldEntries = typedEntries(obj);
  /** @type {<K extends keyof O>(entry: [K, O[K]]) => [K, M]} */
  const mapEntry = ([k, v]) => [k, mapper(v, k)];
  const newEntries = typedMap(oldEntries, mapEntry);
  const newObj = fromTypedEntries(newEntries);
  return /** @type {any} */ (newObj);
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

/**
 * Find all of an object's properties whose name starts with a prefix, and
 * return a new object consisting of those properties without that prefix.
 * Useful for filtering environment variables relevant to a particular purpose.
 *
 * @template {string} P
 * @template {string} K
 * @template V
 * @param {Record<`${P}${K}`, V>} obj
 * @param {P} prefix
 */
export const unprefixedProperties = (obj, prefix) =>
  /** @type {Record<K, V>} */ (
    fromTypedEntries(
      typedEntries(obj)
        .filter(([key]) => key.startsWith(prefix))
        .map(([key, value]) => [key.slice(prefix.length), value]),
    )
  );
