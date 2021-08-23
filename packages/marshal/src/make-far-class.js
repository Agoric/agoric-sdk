// @ts-check

// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

import { passStyleOf } from './passStyleOf';

const { ownKeys } = Reflect;
const { defineProperty } = Object;

const insulate = val => {
  harden(val);
  passStyleOf(val); // asserts that it is passable
  return val;
};

const reservedNames = ['constructor', 'self', '__perform__'];
const reserved = name => reservedNames.includes(name);

/**
 * As long as we're wrapping the methods of our objects-as-closures anyway,
 * can we provide a version that avoids the method-per-instance static
 * allocation overhead which
 *    * still being essentially as safe against this-rebinding attacks
 *    * still supports the convenience of `instance.meth` to get a method
 *      bound to the instance.
 * However, without using a proxy, we cannot make these methods appear to
 * be own properties of the instance, and so cannot support `...` for
 * trait composition.
 *
 * @param {Object} InnerClass
 */
export const makeFarClass = InnerClass => {
  const innerProto = InnerClass.prototype;

  class FarClass {
    #inner;

    constructor(...args) {
      this.#inner = new InnerClass(...args);
      this.#inner.self = this;
    }

    // Name puposely suggests meta-level. Safe to expose.
    // eslint-disable-next-line no-underscore-dangle
    __perform__(name, args) {
      this.#inner; // fail fast if inappropriate this
      assert(!reserved(name));
      const hardArgs = args.map(arg => insulate(arg));
      // Gives the inner method access to the inner instance for
      // accessing its own private state.
      const result = this.#inner[name](...hardArgs);
      return insulate(result);
    }
  }
  const farProto = FarClass.prototype;

  // TODO I think we can move this loop into the FarClass scope, so
  // we can inline __perform__ and get rid of it as a separate method.
  for (const name of ownKeys(innerProto)) {
    if (!reserved(name)) {
      const meth = innerProto[name];
      if (typeof meth === 'function') {
        defineProperty(farProto, name, {
          get() {
            // We return an arrow function so its lexical `this` is
            // the dynamic this of the getter, which will normally be
            // an object that inherits this access for farProto, i.e.,
            // typically an instance of this FarClass.
            return (...args) =>
              // eslint-disable-next-line no-underscore-dangle
              this.__perform__(name, args);
          },
          enumerable: false,
          configurable: false,
        });
      }
    }
  }
  return FarClass;
};
harden(makeFarClass);
