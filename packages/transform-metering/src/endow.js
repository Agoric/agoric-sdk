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

  const wrapDescriptor = desc =>
    Object.fromEntries(Object.entries(desc).map(([k, v]) =>
      [k, wrap(v)]
    ));

  function wrap(target) {
    if (Object(target) !== target) {
      return target;
    }

    let wrapper = wrapped.get(target);
    if (wrapper) {
      return wrapper;
    }

    if (typeof target === 'function') {
      // Meter the call to the function/constructor.
      wrapper = function meterFunction(...args) {
        try {
          meter[c.METER_ENTER]();
          const newTarget = new.target;
          let ret;
          if (newTarget) {
            ret = Reflect.construct(target, args, newTarget);
          } else {
            ret = Reflect.apply(target, this, args);
          }
          ret = meter[c.METER_ALLOCATE](ret);
          // We are only scared of primitives that return functions.
          // The other ones will be caught by the wrapped prototypes
          // or instrumented user code.
          if (typeof ret === 'function') {
            return wrap(ret);
          }
          return ret;
        } catch (e) {
          throw meter[c.METER_ALLOCATE](e);
        } finally {
          meter[c.METER_LEAVE]();
        }
      };
    } else {
      wrapper = create(Object.getPrototypeOf(target));
    }

    // We have a wrapper identity, so prevent recursion.
    wrapped.set(target, wrapper);
    wrapped.set(wrapper, wrapper);

    // Assign the wrapped descriptors to the wrapper.
    const descs = Object.fromEntries(Object.entries(getOwnPropertyDescriptors(target))
      .map(([k, v]) => [k, wrapDescriptor(v)]));
    Object.defineProperties(wrapper, descs);
    return wrapper;
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
