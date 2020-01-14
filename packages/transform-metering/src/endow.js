import harden from '@agoric/harden';

import * as c from './constants';

const { create, getOwnPropertyDescriptor, getOwnPropertyDescriptors } = Object;

export function makeMeteringEndowments(
  meter,
  globalsToShadow,
  endowments = {},
  overrideMeterId = c.DEFAULT_METER_ID,
) {
  const wrapped = new WeakMap();
  const meterId = overrideMeterId;
  function wrap(target, needBeFunction = false) {
    if (
      Object(target) !== target ||
      (needBeFunction && typeof target !== 'function')
    ) {
      return target;
    }
    let wrapper = wrapped.get(target);
    if (wrapper) {
      return wrapper;
    }

    let t;
    if (typeof target === 'function') {
      if (getOwnPropertyDescriptor(target, 'prototype')) {
        t = function fakeTarget() {};
      } else {
        t = () => {};
      }
    } else if (Array.isArray(target)) {
      t = [];
    } else {
      t = {};
    }

    wrapper = new Proxy(t, {
      apply(_t, thisArg, argArray) {
        // Meter the call to the function.
        try {
          meter[c.METER_ENTER]();
          const ret = Reflect.apply(target, thisArg, argArray);
          return wrap(meter[c.METER_ALLOCATE](ret), true);
        } catch (e) {
          throw meter[c.METER_ALLOCATE](e);
        } finally {
          meter[c.METER_LEAVE]();
        }
      },
      construct(_t, argArray, newTarget) {
        // Meter the call to the constructor.
        try {
          meter[c.METER_ENTER]();
          const ret = Reflect.construct(target, argArray, newTarget);
          return wrap(meter[c.METER_ALLOCATE](ret), true);
        } catch (e) {
          throw meter[c.METER_ALLOCATE](e);
        } finally {
          meter[c.METER_LEAVE]();
        }
      },
      get(_t, p, receiver) {
        // Return a wrapped value.
        return wrap(Reflect.get(target, p, receiver));
      },
      getOwnPropertyDescriptor(_t, p) {
        // Return a wrapped descriptor.
        // eslint-disable-next-line no-use-before-define
        return wrapDescriptor(getOwnPropertyDescriptor(target, p));
      },
      getPrototypeOf(_t) {
        return wrap(Reflect.getPrototypeOf(target));
      },
    });
    wrapped.set(target, wrapper);
    return wrapper;
  }

  function wrapDescriptor(desc) {
    if (!desc) {
      return desc;
    }
    if ('value' in desc) {
      return {
        ...desc,
        value: wrap(desc.value),
      };
    }
    return {
      ...desc,
      get: wrap(desc.get),
      set: wrap(desc.set),
    };
  }

  // Shadow the wrapped globals with the wrapped endowments.
  const shadowDescs = create(null);
  Object.entries(getOwnPropertyDescriptors(globalsToShadow)).forEach(
    ([p, desc]) => {
      shadowDescs[p] = wrapDescriptor(desc);
    },
  );

  Object.entries(getOwnPropertyDescriptors(endowments)).forEach(([p, desc]) => {
    // We wrap the endowment descriptors, too.
    // If it is desirable to include a non-wrapped endowment, then add it to
    // the returned shadow object later.
    shadowDescs[p] = wrapDescriptor(desc);
  });

  // Set the meterId to be the meter.
  shadowDescs[meterId] = {
    configurable: false,
    enumerable: false,
    writable: false,
    value: harden(meter),
  };

  // Package up these endowments as an object.
  return create(null, shadowDescs);
}
