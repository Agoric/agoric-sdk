import * as c from './constants';

const { isArray } = Array;
const { getOwnPropertyDescriptors } = Object;
const { ceil } = Math;
const ObjectConstructor = Object;

const bigIntWord = 2n ** 64n;
const bigIntZero = 0n;

// Stop deducting when we reach a negative number.
const makeCounter = initBalance => {
  let balance = initBalance;
  const counter = (increment, alwaysDecrement = true) => {
    if (balance <= 0 && !alwaysDecrement) {
      return 1;
    }
    if (balance > 0) {
      balance += increment;
    }
    return balance;
  };
  counter.reset = (newBalance = undefined) =>
    (balance = newBalance === undefined ? initBalance : newBalance);
  counter.getBalance = () => balance;
  return counter;
};

export function makeAborter() {
  let abortReason;
  const maybeAbort = (reason = undefined, throwForever = true) => {
    if (reason !== undefined) {
      // Set a new reason.
      abortReason = reason;
    }
    if (abortReason !== undefined && throwForever) {
      // Keep throwing the same reason.
      throw abortReason;
    }
    return abortReason;
  };
  maybeAbort.reset = () => (abortReason = undefined);
  return maybeAbort;
}

export function makeComputeMeter(maybeAbort, meter, computeCounter = null) {
  if (computeCounter === null) {
    return (_cost = 1, throwForever = true) => {
      maybeAbort(undefined, throwForever);
    };
  }
  return (cost = 1, throwForever = true) => {
    maybeAbort(undefined, throwForever);
    if (computeCounter(-cost, throwForever) <= 0) {
      throw maybeAbort(RangeError(`Compute meter exceeded`), throwForever);
    }
  };
}

export function makeAllocateMeter(maybeAbort, meter, allocateCounter = null) {
  if (allocateCounter === null) {
    return (value, throwForever = true) => {
      maybeAbort(undefined, throwForever);
      return value;
    };
  }
  return (value, throwForever = true) => {
    maybeAbort(undefined, throwForever);
    try {
      // meter[c.METER_ENTER](undefined, throwForever);
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
            meter[c.METER_COMPUTE](undefined, throwForever);
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
              remaining /= bigIntWord;
              cost += 1;
            }
            break;
          }
          case 'object':
            if (value !== null) {
              throw maybeAbort(
                TypeError(`Allocate meter found unexpected non-null object`),
                throwForever,
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
              throwForever,
            );
        }
      }

      if (allocateCounter(-cost, throwForever) <= 0) {
        throw maybeAbort(RangeError(`Allocate meter exceeded`), throwForever);
      }
      return value;
    } finally {
      // meter[c.METER_LEAVE](undefined, throwForever);
    }
  };
}

export function makeStackMeter(maybeAbort, meter, stackCounter = null) {
  if (stackCounter === null) {
    return (_cost, throwForever = true) => {
      maybeAbort(undefined, throwForever);
    };
  }
  return (cost = 1, throwForever = true) => {
    try {
      meter[c.METER_COMPUTE](undefined, throwForever);
      maybeAbort(undefined, throwForever);
      if (stackCounter(-cost, throwForever) <= 0) {
        throw maybeAbort(RangeError(`Stack meter exceeded`), throwForever);
      }
    } catch (e) {
      throw maybeAbort(e, throwForever);
    }
  };
}

export function makeMeter(budgets = {}) {
  let combinedCounter;
  const counter = (vname, dflt) => {
    const budget = vname in budgets ? budgets[vname] : c[dflt];
    if (budget === true) {
      if (!combinedCounter) {
        throw TypeError(
          `A budgetCombined value must be set to use the combined meter for ${vname}`,
        );
      }
      return combinedCounter;
    }
    return budget === null ? null : makeCounter(budget);
  };

  combinedCounter = counter('budgetCombined', 'DEFAULT_COMBINED_METER');
  const allocateCounter = counter('budgetAllocate', 'DEFAULT_ALLOCATE_METER');
  const computeCounter = counter('budgetCompute', 'DEFAULT_COMPUTE_METER');
  const stackCounter = counter('budgetStack', 'DEFAULT_STACK_METER');

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
  const isExhausted = () => {
    return maybeAbort(undefined, false);
  };

  const refillFacet = {
    isExhausted,
    allocate: makeResetter(allocateCounter),
    stack: makeResetter(stackCounter),
    compute: makeResetter(computeCounter),
    combined: makeResetter(combinedCounter),
    getAllocateBalance: allocateCounter.getBalance,
    getComputeBalance: computeCounter.getBalance,
    getCombinedBalance: combinedCounter.getBalance,
  };

  // Create the internal meter object.
  meter[c.METER_ALLOCATE] = meterAllocate;
  meter[c.METER_COMPUTE] = meterCompute;
  meter[c.METER_ENTER] = meterStack;
  meter[c.METER_LEAVE] = () => meterStack(-1);
  meter.isExhausted = isExhausted;

  // Export the allocate meter with other meters as properties.
  Object.assign(meterAllocate, meter);
  return {
    meter: meterAllocate,
    refillFacet,
  };
}
