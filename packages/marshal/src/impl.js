// @ts-check

// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

import { Far } from './make-far.js';
import { passStyleOf } from './passStyleOf.js';

const { ownKeys, construct, apply } = Reflect;
const {
  defineProperty,
  defineProperties,
  getPrototypeOf,
  setPrototypeOf,
} = Object;

const reservedNames = ['constructor', Symbol.toStringTag];
const reserved = name => reservedNames.includes(name);

/**
 * @callback Guard
 * @param {any} val
 * @returns {any}
 */

/** @type {Guard} */
const guard = val => {
  harden(val);
  passStyleOf(val); // asserts that it is passable
  return val;
};

/**
 * @typedef {Object} Interface
 * @property {(name: string | symbol) => Guard} getArgsGuard
 * @property {(name: string | symbol) => Guard} getResultGuard
 */

/**
 * @param {string} farName
 * @returns {Interface}
 */
export const makeInterface = farName =>
  Far('interface', {
    toString: () => farName,
    getArgsGuard: _name => guard,
    getResultGuard: _name => guard,
  });
harden(makeInterface);

/**
 * Returns a class like rawClass that implements the interface. The interface
 * comes first because it is typically a variable name, whereas the
 * `rawClass` should be the class definition itself inline, so that there are
 * no other references to the original rawClass.
 *
 * Does surgery on `rawClass` in place so its instances are also instances
 * of the returned maker, where all the methods are defensive wrappers of
 * the original raw methods
 *
 * @param {Interface} iface Will be a source of schema for checking the arguments
 * going in to each method, and the result being returned.
 * @param {Object} rawClass Assuming this is the only reference, afterwards the
 * rawClass itself should be inaccessible, encapsulated only within the maker.
 * @returns {Object} A function that can be used either as a replacement class
 * or as a maker. It can be used with or without `new`, and can be extended
 * by subclasses.
 */
export const impl = (iface, rawClass) => {
  const proto = rawClass.prototype;
  const instances = new WeakSet();
  const suspectMakerArgs = iface.getArgsGuard('constructor');

  function maker(...args) {
    const instance = construct(rawClass, suspectMakerArgs(args), new.target);
    instances.add(instance);
    if (new.target === undefined || new.target === maker) {
      harden(instance);
    }
    return instance;
  }
  setPrototypeOf(maker, getPrototypeOf(rawClass));
  defineProperties(maker, {
    prototype: {
      // Shares the same proto, so instanceof works.
      value: proto,
    },
    name: {
      value: rawClass.name,
    },
    length: {
      value: rawClass.length,
    },
  });

  defineProperties(proto, {
    [Symbol.toStringTag]: {
      value: `Alleged: ${iface}`,
    },
    constructor: {
      // Points back at the maker as the constructor, hopefully making rawClass,
      // the original constructor, inaccessible.
      value: maker,
    },
  });

  for (const name of ownKeys(proto)) {
    if (!reserved(name)) {
      const rawMethod = proto[name];
      if (typeof rawMethod === 'function') {
        const suspectArgs = iface.getArgsGuard(name);
        const protectResult = iface.getResultGuard(name);
        defineProperty(proto, name, {
          get() {
            assert(instances.has(this)); // fail fast in the getter!
            // We return an arrow function so its lexical `this` is
            // the dynamic `this` of the getter, which must be an object
            // made by this maker! The getter returns a method safely
            // bound to the instance, in which the args and result are
            // themselves safely insulated.
            return (...args) =>
              protectResult(apply(rawMethod, this, suspectArgs(args)));
          },
        });
      }
    }
  }
  // @ts-ignore iface will coerce to the right string. Far will eventually be
  // changed to accept an Interface.
  // eslint-disable-next-line no-func-assign
  maker = Far(iface, maker);

  return maker;
};
harden(impl);
