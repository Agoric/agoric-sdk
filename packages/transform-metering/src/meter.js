/* global BigInt */
import harden from '@agoric/harden';

import * as c from './constants';

const { isArray } = Array;
const { getOwnPropertyDescriptors } = Object;
const { ceil } = Math;
const ObjectConstructor = Object;

// eslint-disable-next-line no-bitwise
const bigIntWord = typeof BigInt !== 'undefined' && BigInt(1 << 32);
const bigIntZero = bigIntWord && BigInt(0);

// Stop deducting when we reach a negative number.
const makeCounter = initBalance => {
  let balance = initBalance;
  const counter = increment => {
    if (balance > 0) {
      balance += increment;
    }
    return balance;
  };
  counter.reset = (newBalance = undefined) =>
    (balance = newBalance === undefined ? initBalance : newBalance);
  return counter;
};

export function makeAborter() {
  let abortReason;
  const maybeAbort = (reason = undefined) => {
    if (reason !== undefined) {
      // Set a new reason.
      abortReason = harden(reason);
    }
    if (abortReason !== undefined) {
      // Keep throwing the same reason.
      throw abortReason;
    }
  };
  maybeAbort.reset = () => (abortReason = undefined);
  return harden(maybeAbort);
}

export function makeComputeMeter(maybeAbort, meter, computeCounter = null) {
  if (computeCounter === null) {
    return maybeAbort;
  }
  return (cost = 1) => {
    maybeAbort();
    if (computeCounter(-cost) <= 0) {
      throw maybeAbort(RangeError(`Compute meter exceeded`));
    }
  };
}

export function makeAllocateMeter(maybeAbort, meter, allocateCounter = null) {
  if (allocateCounter === null) {
    return value => {
      maybeAbort();
      return value;
    };
  }
  return value => {
    try {
      meter[c.METER_ENTER]();
      maybeAbort();
      let cost = 1;
      if (value && ObjectConstructor(value) === value) {
        // Either an array or an object with properties.
        if (isArray(value)) {
          // The size of the array.  This property cannot be overridden.
          cost += value.length;
        } else {
          // Compute the number of own properties.
          // eslint-disable-next-line guard-for-in, no-unused-vars
          for (const p in getOwnPropertyDescriptors(value)) {
            meter[c.METER_COMPUTE]();
            cost += 1;
          }
        }
      } else {
        // We have a primitive.
        const t = typeof value;
        switch (t) {
          case 'string':
            // The size of the string, in approximate words.
            cost += ceil(value.length / 4);
            break;
          case 'bigint': {
            // Compute the number of words in the bigint.
            let remaining = value;
            if (remaining < bigIntZero) {
              remaining = -remaining;
            }
            while (remaining > bigIntZero) {
              meter[c.METER_COMPUTE]();
              remaining /= bigIntWord;
              cost += 1;
            }
            break;
          }
          case 'object':
            if (value !== null) {
              throw maybeAbort(
                TypeError(`Allocate meter found unexpected non-null object`),
              );
            }
            // Otherwise, minimum cost.
            break;
          case 'boolean':
          case 'undefined':
          case 'number':
          case 'symbol':
            // Minimum cost.
            break;
          default:
            throw maybeAbort(
              TypeError(`Allocate meter found unrecognized type ${t}`),
            );
        }
      }

      if (allocateCounter(-cost) <= 0) {
        throw maybeAbort(RangeError(`Allocate meter exceeded`));
      }
      return value;
    } finally {
      meter[c.METER_LEAVE]();
    }
  };
}

export function makeStackMeter(maybeAbort, meter, stackCounter = null) {
  if (stackCounter === null) {
    return _ => maybeAbort();
  }
  return (cost = 1) => {
    try {
      maybeAbort();
      if (stackCounter(-cost) <= 0) {
        throw maybeAbort(RangeError(`Stack meter exceeded`));
      }
      meter[c.METER_COMPUTE]();
    } catch (e) {
      throw maybeAbort(e);
    }
  };
}

export function makeMeterAndResetters(maxima = {}) {
  let combinedCounter;
  const counter = (vname, dflt) => {
    const max = vname in maxima ? maxima[vname] : c[dflt];
    if (max === true) {
      if (!combinedCounter) {
        throw TypeError(
          `A maxCombined value must be set to use the combined meter for ${vname}`,
        );
      }
      return combinedCounter;
    }
    return max === null ? null : makeCounter(max);
  };

  combinedCounter = counter('maxCombined', 'DEFAULT_COMBINED_METER');
  const allocateCounter = counter('maxAllocate', 'DEFAULT_ALLOCATE_METER');
  const computeCounter = counter('maxCompute', 'DEFAULT_COMPUTE_METER');
  const stackCounter = counter('maxStack', 'DEFAULT_STACK_METER');

  // Link all the meters together with the same aborter.
  const maybeAbort = makeAborter();
  const meter = {};
  // The stack meter has no other dependencies.
  const meterStack = makeStackMeter(maybeAbort, meter, stackCounter);
  // The compute meter only needs the stack meter.
  const meterCompute = makeComputeMeter(maybeAbort, meter, computeCounter);
  // Allocate meters need both stack and compute meters.
  const meterAllocate = makeAllocateMeter(maybeAbort, meter, allocateCounter);

  const makeResetter = cnt => (newBalance = undefined) => {
    maybeAbort.reset();
    if (cnt) {
      cnt.reset(newBalance);
    }
  };
  const resetters = {
    isExhausted() {
      try {
        maybeAbort();
        return undefined;
      } catch (e) {
        return e;
      }
    },
    allocate: makeResetter(allocateCounter),
    stack: makeResetter(stackCounter),
    compute: makeResetter(computeCounter),
    combined: makeResetter(combinedCounter),
  };

  // Create the internal meter object.
  meter[c.METER_ALLOCATE] = meterAllocate;
  meter[c.METER_COMPUTE] = meterCompute;
  meter[c.METER_ENTER] = meterStack;
  meter[c.METER_LEAVE] = () => meterStack(-1);

  // Export the allocate meter with other meters as properties.
  Object.assign(meterAllocate, meter);
  return [harden(meterAllocate), harden(resetters)];
}

export function makeMeter(maxima = {}) {
  return makeMeterAndResetters(maxima)[0];
}
