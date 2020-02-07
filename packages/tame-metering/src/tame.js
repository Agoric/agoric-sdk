/* global globalThis */
import * as c from './constants';

const {
  defineProperty,
  entries,
  getOwnPropertyDescriptor,
  getOwnPropertyDescriptors,
} = Object;
const { apply, construct, get } = Reflect;
const { get: wmGet, set: wmSet } = WeakMap.prototype;

const ObjectConstructor = Object;

let setGlobalMeter;

export default function tameMetering() {
  if (setGlobalMeter) {
    // Already installed.
    return setGlobalMeter;
  }

  let globalMeter;
  const wrapped = new WeakMap();
  const setWrapped = (...args) => apply(wmSet, wrapped, args);
  const getWrapped = (...args) => apply(wmGet, wrapped, args);

  const wrapDescriptor = desc => {
    const newDesc = {};
    for (const [k, v] of entries(desc)) {
      // eslint-disable-next-line no-use-before-define
      newDesc[k] = wrap(v);
    }
    return newDesc;
  };

  function wrap(target, deepMeter = globalMeter) {
    if (ObjectConstructor(target) !== target) {
      return target;
    }

    const meter = globalMeter;
    if (target === meter) {
      return target;
    }

    let wrapper = getWrapped(target);
    if (wrapper) {
      return wrapper;
    }

    if (typeof target === 'function') {
      // Meter the call to the function/constructor.
      wrapper = function meterFunction(...args) {
        // We first install no meter to make metering explicit.
        const userMeter = setGlobalMeter(null);
        try {
          userMeter && userMeter[c.METER_ENTER]();
          let ret;
          try {
            // Temporarily install the deep meter.
            setGlobalMeter(deepMeter);
            const newTarget = new.target;
            if (newTarget) {
              ret = construct(target, args, newTarget);
            } else {
              ret = apply(target, this, args);
            }
          } finally {
            // Resume explicit metering.
            setGlobalMeter(null);
          }
          userMeter && userMeter[c.METER_ALLOCATE](ret);
          return ret;
        } catch (e) {
          userMeter && userMeter[c.METER_ALLOCATE](e);
          throw e;
        } finally {
          // Resume the user meter.
          userMeter && userMeter[c.METER_LEAVE]();
          setGlobalMeter(userMeter);
        }
      };

      // Replace the constructor.
      const proto = get(target, 'prototype');
      if (proto && getOwnPropertyDescriptor(proto, 'constructor')) {
        defineProperty(proto, 'constructor', { value: wrapper });
      }
    } else {
      // Don't redefine the object: mutate in place.
      wrapper = target;
    }

    // We have a wrapper identity, so prevent recursion.
    setWrapped(target, wrapper);
    setWrapped(wrapper, wrapper);

    // Assign the wrapped descriptors to the wrapper.
    for (const [p, desc] of entries(getOwnPropertyDescriptors(target))) {
      defineProperty(wrapper, p, wrapDescriptor(desc));
    }

    return wrapper;
  }

  // Override the globals with wrappers.
  wrap(globalThis, null);

  // Provide a way to set the meter.
  setGlobalMeter = m => {
    const oldMeter = globalMeter;
    globalMeter = m;
    return oldMeter;
  };
  return setGlobalMeter;
}
