// @ts-check
import { getMethodNames as realGetMethodNames } from '@endo/eventual-send/utils.js';

/**
 * @file method-tools use dynamic property lookup, which is not
 *   Jessie-compatible
 */

const { create, fromEntries } = Object;
const { apply } = Reflect;

/**
 * TODO Consolidate with the `getMethodNames` in `@endo/eventual-send`
 *
 * @deprecated Use `getMethodNames` from `@endo/eventual-send/utils.js` instead.
 * @template {PropertyKey} K
 * @param {Record<K, any>} val
 * @returns {K[]}
 */
export const getMethodNames = val =>
  /** @type {K[]} */ (realGetMethodNames(val));
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
    realGetMethodNames(val).filter(name => typeof name === 'string')
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
        realGetMethodNames(obj).map(name => [
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
