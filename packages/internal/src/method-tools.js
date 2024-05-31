// @ts-check
import { isObject } from '@endo/marshal';

/**
 * @file method-tools use dynamic property lookup, which is not
 *   Jessie-compatible
 */

const { getPrototypeOf, create, fromEntries, getOwnPropertyDescriptors } =
  Object;
const { ownKeys, apply } = Reflect;

/**
 * Prioritize symbols as earlier than strings.
 *
 * @param {string | symbol} a
 * @param {string | symbol} b
 * @returns {-1 | 0 | 1}
 */
const compareStringified = (a, b) => {
  if (typeof a === typeof b) {
    const left = String(a);
    const right = String(b);
    // eslint-disable-next-line no-nested-ternary
    return left < right ? -1 : left > right ? 1 : 0;
  }
  if (typeof a === 'symbol') {
    assert(typeof b === 'string');
    return -1;
  }
  assert(typeof a === 'string');
  assert(typeof b === 'symbol');
  return 1;
};

/**
 * TODO Consolidate with the `getMethodNames` in `@endo/eventual-send`
 *
 * @template {PropertyKey} K
 * @param {Record<K, any>} val
 * @returns {K[]}
 */
export const getMethodNames = val => {
  let layer = val;
  const names = new Set(); // Set to deduplicate
  while (layer !== null && layer !== Object.prototype) {
    // be tolerant of non-objects
    const descs = getOwnPropertyDescriptors(layer);
    const ownNames = /** @type {K[]} */ (ownKeys(descs));
    for (const name of ownNames) {
      // In case a method is overridden by a non-method,
      // test `val[name]` rather than `layer[name]`
      if (typeof val[name] === 'function') {
        names.add(name);
      }
    }
    if (!isObject(val)) {
      break;
    }
    layer = getPrototypeOf(layer);
  }
  return harden([...names].sort(compareStringified));
};
harden(getMethodNames);

/**
 * The subset of `getMethodNames` containing only string names, without symbols
 *
 * @template {PropertyKey} K
 * @param {Record<K, any>} val
 * @returns {string[]}
 */
export const getStringMethodNames = val =>
  /** @type {string[]} */ (
    getMethodNames(val).filter(name => typeof name === 'string')
  );

/**
 * TODO This function exists only to ease the
 * https://github.com/Agoric/agoric-sdk/pull/5970 transition, from all methods
 * being own properties to methods being inherited from a common prototype. This
 * transition breaks two patterns used in prior code: autobinding, and
 * enumerating methods by enumerating own properties. For both, the preferred
 * repairs are
 *
 * - autobinding: Replace, for example, `foo(obj.method)` with `foo(arg =>
 *   `obj.method(arg))`. IOW, stop relying on expressions like `obj.method`to
 *   extract a method still bound to the state of`obj` because, for virtual and
 *   durable objects, they no longer will after #5970.
 * - method enumeration: Replace, for example `Reflect.ownKeys(obj)` with
 *   `getMethodNames(obj)`.
 *
 * Once all problematic cases have been converted in this manner, this
 * `bindAllMethods` hack can and TODO should be deleted. However, we currently
 * have no reliable static way to track down and fix all autobinding sites. For
 * those objects that have not yet been fully repaired by the above two
 * techniques, `bindAllMethods` creates an object that acts much like the
 * pre-#5970 objects, with all their methods as instance-bound own properties.
 * It does this by making a new object inheriting from `obj` where the new
 * object has bound own methods overridding all the methods it would have
 * inherited from `obj`.
 *
 * @template {Record<PropertyKey, any>} T
 * @param {T} obj
 * @returns {T}
 */
export const bindAllMethods = obj =>
  harden(
    create(
      obj,
      fromEntries(
        getMethodNames(obj).map(name => [
          name,
          {
            value: (/** @type {unknown[]} */ ...args) =>
              apply(obj[name], obj, args),
            enumerable: true,
          },
        ]),
      ),
    ),
  );
harden(bindAllMethods);
