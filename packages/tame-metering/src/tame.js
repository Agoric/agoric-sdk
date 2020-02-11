/* global globalThis */
import * as c from './constants';

const {
  defineProperties,
  entries,
  fromEntries,
  getOwnPropertyDescriptors,
} = Object;
const { apply, construct, get } = Reflect;
const { get: wmGet, set: wmSet } = WeakMap.prototype;

const ObjectConstructor = Object;

let replaceGlobalMeter;

export default function tameMetering() {
  if (replaceGlobalMeter) {
    // Already installed.
    return replaceGlobalMeter;
  }

  let globalMeter = null;
  const wrapped = new WeakMap();
  const setWrapped = (...args) => apply(wmSet, wrapped, args);
  const getWrapped = (...args) => apply(wmGet, wrapped, args);

  /*
  setWrapped(Error, Error); // FIGME: debugging
  setWrapped(console, console); // FIGME
  */
  const wrapDescriptor = desc => {
    const newDesc = {};
    for (const [k, v] of entries(desc)) {
      // eslint-disable-next-line no-use-before-define
      newDesc[k] = wrap(v);
    }
    return newDesc;
  };

  function wrap(target) {
    if (ObjectConstructor(target) !== target) {
      return target;
    }

    let wrapper = getWrapped(target);
    if (wrapper) {
      return wrapper;
    }

    const isFunction = typeof target === 'function';
    if (isFunction) {
      // Meter the call to the function/constructor.
      wrapper = function meterFunction(...args) {
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
          // savedMeter && savedMeter[c.METER_ENTER](undefined, false);
          savedMeter && savedMeter[c.METER_COMPUTE](undefined, false);
          let ret;

          // Reinstall the saved meter for the actual function invocation.
          globalMeter = savedMeter;
          const newTarget = new.target;
          if (newTarget) {
            ret = construct(target, args, newTarget);
          } else {
            ret = apply(target, this, args);
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
      };
    } else {
      // Don't redefine the object: mutate in place.
      wrapper = target;
    }

    // We have a wrapper identity, so prevent recursion.
    setWrapped(target, wrapper);
    setWrapped(wrapper, wrapper);

    if (isFunction) {
      // Replace the constructor.
      const proto = get(target, 'prototype');
      if (proto) {
        const wproto = wrap(proto);
        wproto.constructor = wrapper;
      }
    }

    // Assign the wrapped descriptors to the wrapper.
    const props = entries(
      getOwnPropertyDescriptors(target),
    ).map(([p, desc]) => [p, wrapDescriptor(desc)]);
    defineProperties(wrapper, fromEntries(props));

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
