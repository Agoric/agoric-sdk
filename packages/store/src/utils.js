// @ts-check

// TODO https://github.com/Agoric/agoric-sdk/issues/5992
// Many of the utilities accumulating in this module really have nothing
// to do with the store package. Follow #5992 and migrate them, or perhaps
// the entire utils.js module, to that independent sdk-internal package
// that we will need to create.

const { getPrototypeOf, create, fromEntries } = Object;
const { ownKeys, apply } = Reflect;

/** @typedef {import('@endo/marshal/src/types').Remotable} Remotable */

const compareStringified = (left, right) => {
  left = String(left);
  right = String(right);
  // eslint-disable-next-line no-nested-ternary
  return left < right ? -1 : left > right ? 1 : 0;
};

/**
 * @param {object} obj
 * @returns {(string|symbol)[]}
 */
export const getMethodNames = obj => {
  const result = [];
  while (obj !== null && obj !== Object.prototype) {
    const mNames = ownKeys(obj).filter(name => typeof obj[name] === 'function');
    result.push(...mNames);
    obj = getPrototypeOf(obj);
  }
  result.sort(compareStringified);
  return harden(result);
};
harden(getMethodNames);

/**
 * TODO This function exists only to ease the
 * https://github.com/Agoric/agoric-sdk/pull/5970 transition, from all methods
 * being own properties to methods being inherited from a common prototype.
 * This transition breaks two patterns used in prior code: autobinding,
 * and enumerating methods by enumerating own properties. For both, the
 * preferred repairs are
 *    * autobinding: Replace, for example,
 *      `foo(obj.method)` with `foo(arg => `obj.method(arg))`. IOW, stop relying
 *      on expressions like `obj.method` to extract a method still bound to the
 *      state of `obj` because, for virtual and durable objects,
 *      they no longer will after #5970.
 *    * method enumeration: Replace, for example
 *      `Reflect.ownKeys(obj)` with `getMethodNames(obj)`.
 *
 * Once all problematic cases have been converted in this manner, this
 * `bindAllMethods` hack can and TODO should be deleted. However, we currently
 * have no reliable static way to track down and fix all autobinding sites.
 * For those objects that have not yet been fully repaired by the above two
 * techniques, `bindAllMethods` creates an object that acts much like the
 * pre-#5970 objects, with all their methods as instance-bound own properties.
 * It does this by making a new object inheriting from `obj` where the new
 * object has bound own methods overridding all the methods it would have
 * inherited from `obj`.
 *
 * @param {Remotable} obj
 * @returns {Remotable}
 */
export const bindAllMethods = obj =>
  harden(
    create(
      obj,
      fromEntries(
        getMethodNames(obj).map(name => [
          name,
          {
            value: (...args) => apply(obj[name], obj, args),
          },
        ]),
      ),
    ),
  );
harden(bindAllMethods);
