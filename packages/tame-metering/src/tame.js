/* global globalThis */
import * as c from './constants';

let replaceGlobalMeter;

export function tameMetering() {
  if (replaceGlobalMeter) {
    // Already installed.
    return replaceGlobalMeter;
  }

  const { defineProperties, entries, getOwnPropertyDescriptors } = Object;
  const { apply, construct, get } = Reflect;
  const { get: wmGet, set: wmSet } = WeakMap.prototype;

  const ObjectConstructor = Object;
  const ProxyConstructor = Proxy;

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

    if (typeof target === 'function') {
      wrapper = new ProxyConstructor(target, {
        apply(t, thisArg, argArray) {
          // We're careful not to use the replaceGlobalMeter function as
          // it may consume some stack.
          // Instead, directly manipulate the globalMeter variable.
          const savedMeter = globalMeter;
          try {
            // This is a common idiom to disable global metering so
            // that the savedMeter can use builtins without
            // recursively calling itself.

            // Track the entry of the stack frame.
            globalMeter = null;
            /* savedMeter && savedMeter[c.METER_ENTER](undefined, false); */
            savedMeter && savedMeter[c.METER_COMPUTE](undefined, false);

            // Reinstall the saved meter for the actual function invocation.
            globalMeter = savedMeter;
            const ret = apply(t, thisArg, argArray);

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
            /*
            try {
              // Declare we left the stack frame.
              globalMeter = null;
              savedMeter && savedMeter[c.METER_LEAVE](undefined, false);
            } finally {
              // Resume the saved meter, if there was one.
              globalMeter = savedMeter;
            }
            */
          }
        },
        construct(t, argArray, newTarget) {
          // We're careful not to use the replaceGlobalMeter function as
          // it may consume some stack.
          // Instead, directly manipulate the globalMeter variable.
          const savedMeter = globalMeter;
          try {
            // This is a common idiom to disable global metering so
            // that the savedMeter can use builtins without
            // recursively calling itself.

            // Track the entry of the stack frame.
            globalMeter = null;
            /* savedMeter && savedMeter[c.METER_ENTER](undefined, false); */
            savedMeter && savedMeter[c.METER_COMPUTE](undefined, false);

            // Reinstall the saved meter for the actual function invocation.
            globalMeter = savedMeter;
            const ret = construct(t, argArray, newTarget);

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
            /*
            try {
              // Declare we left the stack frame.
              globalMeter = null;
              savedMeter && savedMeter[c.METER_LEAVE](undefined, false);
            } finally {
              // Resume the saved meter, if there was one.
              globalMeter = savedMeter;
            }
            */
          }
        },
      });
    } else {
      // Preserve identity and mutate in place.
      wrapper = target;
    }

    // We have a wrapper identity, so prevent recursion by installing it now.
    setWrapped(target, wrapper);
    setWrapped(wrapper, wrapper);

    const proto = get(target, 'prototype');
    if (proto && proto !== FunctionPrototype) {
      // Replace the constructor.
      const wproto = wrap(proto, pname && `${pname}.prototype`, wrapper);
      if (proto !== wproto) {
        throw Error(`prototype wrapping didn't preserve identity ${pname}`);
      }
    }

    // Assign the wrapped descriptors to the wrapper.
    const descs = {};
    for (const [p, desc] of entries(getOwnPropertyDescriptors(target))) {
      if (constructor && p === 'constructor') {
        descs[p] = {
          value: constructor,
          writable: true,
          enumerable: false,
          configurable: true,
        };
      } else if (p !== 'prototype') {
        descs[p] = wrapDescriptor(desc, pname && `${pname}.${p}`);
      }
    }

    defineProperties(target, descs);
    return wrapper;
  }

  // Override the globals with wrappers.
  wrap(globalThis);

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
