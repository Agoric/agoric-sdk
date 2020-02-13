/* global globalThis */
import * as c from './constants';

let replaceGlobalMeter;

// When using this function's text in a SES-1.0 shim, we redefine this
// constant to be Error.
const SES1ErrorConstructor = null;

export function tameMetering() {
  if (replaceGlobalMeter) {
    // Already installed.
    return replaceGlobalMeter;
  }

  const {
    defineProperty,
    entries,
    getOwnPropertyDescriptors,
    getOwnPropertyDescriptor,
    getPrototypeOf,
    setPrototypeOf,
  } = Object;
  const { apply, construct, get } = Reflect;
  const { get: wmGet, set: wmSet } = WeakMap.prototype;

  const ObjectConstructor = Object;

  const FunctionPrototype = Function.prototype;

  let globalMeter = null;
  const wrapped = new WeakMap();
  const setWrapped = (...args) => apply(wmSet, wrapped, args);
  const getWrapped = (...args) => apply(wmGet, wrapped, args);

  /*
  setWrapped(Error, Error); // FIGME: debugging
  setWrapped(console, console); // FIGME
  */
  const wrapDescriptor = (desc, pname = undefined) => {
    const newDesc = {};
    for (const [k, v] of entries(desc)) {
      // eslint-disable-next-line no-use-before-define
      newDesc[k] = wrap(v, pname && `${pname}.${k}`);
    }
    return newDesc;
  };

  function wrap(target, pname = undefined, constructor = undefined) {
    if (ObjectConstructor(target) !== target) {
      return target;
    }

    let wrapper = getWrapped(target);
    if (wrapper) {
      return wrapper;
    }

    let isConstructor = false;

    // Without this hack, SES-1.0 fails with:
    // TypeError: prototype function Error() { [native code] } of unknown.global.EvalError is not already in the fringeSet
    if (
      typeof target !== 'function' ||
      target === FunctionPrototype ||
      target === SES1ErrorConstructor
    ) {
      // Preserve identity and mutate in place.
      wrapper = target;
    } else if (getOwnPropertyDescriptor(target, 'prototype')) {
      // The wrapper needs construct behaviour.
      isConstructor = true;
      wrapper = function meteredConstructor(...args) {
        if (!globalMeter) {
          // Fast path.
          const newTarget = new.target;
          if (newTarget) {
            return construct(target, args, newTarget);
          }
          return apply(target, this, args);
        }
        // We're careful not to use the replaceGlobalMeter function as
        // it may consume some stack.
        // Instead, directly manipulate the globalMeter variable.
        const savedMeter = globalMeter;
        let ret;
        try {
          // This is a common idiom to disable global metering so
          // that the savedMeter can use builtins without
          // recursively calling itself.

          // Track the consumption of a computron.
          globalMeter = null;
          savedMeter && savedMeter[c.METER_COMPUTE](undefined, false);

          // Reinstall the saved meter for the actual function invocation.
          globalMeter = savedMeter;
          const newTarget = new.target;
          if (!newTarget) {
            ret = apply(target, this, args);
          } else {
            ret = construct(target, args, newTarget);
          }

          // Track the allocation of the return value.
          globalMeter = null;
          savedMeter && savedMeter[c.METER_ALLOCATE](ret, false);
          return ret;
        } catch (e) {
          // Track the allocation of the exception value.
          globalMeter = null;
          savedMeter && savedMeter[c.METER_ALLOCATE](e, false);
          throw e;
        } finally {
          // In case a try block consumes stack.
          globalMeter = savedMeter;
        }
      };
      defineProperty(wrapper, 'name', { value: target.name });
    } else {
      // The function wrapper must not have construct behaviour.
      // Defining it as a concise method ensures the correct
      // properties (type function, sensitive to `this`, but no `.prototype`).
      const { name = '' } = target;
      ({ [name]: wrapper } = {
        [name](...args) {
          // Fast path:
          if (!globalMeter) {
            return apply(target, this, args);
          }
          // We're careful not to use the replaceGlobalMeter function as
          // it may consume some stack.
          // Instead, directly manipulate the globalMeter variable.
          const savedMeter = globalMeter;
          let ret;
          try {
            // This is a common idiom to disable global metering so
            // that the savedMeter can use builtins without
            // recursively calling itself.

            // Track the consumption of a computron.
            globalMeter = null;
            savedMeter && savedMeter[c.METER_COMPUTE](undefined, false);

            // Reinstall the saved meter for the actual function invocation.
            globalMeter = savedMeter;
            ret = apply(target, this, args);

            // Track the allocation of the return value.
            globalMeter = null;
            savedMeter && savedMeter[c.METER_ALLOCATE](ret, false);
            return ret;
          } catch (e) {
            // Track the allocation of the exception value.
            globalMeter = null;
            savedMeter && savedMeter[c.METER_ALLOCATE](e, false);
            throw e;
          } finally {
            // In case a try block consumes stack.
            globalMeter = savedMeter;
          }
        },
      });
    }

    // We have a wrapper identity, so prevent recursion by installing it now.
    setWrapped(target, wrapper);
    setWrapped(wrapper, wrapper);

    if (isConstructor) {
      const proto = get(target, 'prototype');
      if (proto) {
        // Replace the constructor.
        const wproto = wrap(proto, pname && `${pname}.prototype`, wrapper);
        if (proto !== wproto) {
          throw Error(`prototype wrapping didn't preserve identity ${pname}`);
        }
      }
    }

    setPrototypeOf(
      wrapper,
      wrap(getPrototypeOf(target), pname && `${pname}.__proto__`),
    );

    // Assign the wrapped descriptors to the target.
    for (const [p, desc] of entries(getOwnPropertyDescriptors(target))) {
      let newDesc;
      if (constructor && p === 'constructor') {
        newDesc = {
          value: constructor,
          writable: true,
          enumerable: false,
          configurable: true,
        };
      } else {
        newDesc = wrapDescriptor(desc, pname && `${pname}.${p}`);
      }
      defineProperty(wrapper, p, newDesc);
      defineProperty(target, p, newDesc);
    }

    return wrapper;
  }

  // Override the globals and anonymous intrinsics with wrappers.
  const wrapRoot = {
    globalThis,
    async AsyncFunction() {
      await Promise.resolve(123);
      return 456;
    },
    *GeneratorFunction() {
      yield 123;
    },
    async *AsyncGeneratorFunction() {
      yield 123;
    },
  };
  wrap(wrapRoot, '#');

  // Provide a way to set the meter.
  replaceGlobalMeter = m => {
    const oldMeter = globalMeter;
    if (m !== undefined) {
      // console.log('replacing', oldMeter, 'with', m, Error('here')); // FIGME
      globalMeter = m;
    }
    /* if (oldMeter === null) {
      console.log('returning', oldMeter, Error('here'));
    } */
    return oldMeter;
  };
  return replaceGlobalMeter;
}
