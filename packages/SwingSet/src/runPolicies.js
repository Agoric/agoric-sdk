// @ts-check

import { assert } from '@agoric/assert';

export const foreverPolicy = () =>
  harden({
    vatCreated: _details => true,
    crankComplete: _details => true,
    crankFailed: _details => true,
  });

export const crankCounter = (maxCranks, maxCreateVats) => {
  let cranks = 0;
  let vats = 0;
  /** @type { RunPolicy } */
  const policy = harden({
    vatCreated: () => {
      vats += 1;
      return vats < maxCreateVats;
    },
    crankComplete: _details => {
      cranks += 1;
      return cranks < maxCranks;
    },
    crankFailed: () => {
      cranks += 1;
      return cranks < maxCranks;
    },
  });
  return policy;
};

export const computronCounter = limit => {
  assert.typeof(limit, 'bigint');
  let total = 0n;
  /** @type { RunPolicy } */
  const policy = harden({
    vatCreated: () => {
      total += 100000n; // pretend vat creation takes 100k computrons
      return total < limit;
    },
    crankComplete: (details = {}) => {
      assert.typeof(details, 'object');
      if (details.computrons) {
        assert.typeof(details.computrons, 'bigint');
        total += details.computrons;
      }
      return total < limit;
    },
    crankFailed: () => {
      total += 1000000n; // who knows, 1M is as good as anything
      return total < limit;
    },
  });
  return policy;
};

export const wallClockWaiter = seconds => {
  const timeout = Date.now() + 1000 * seconds;
  /** @type { RunPolicy } */
  const policy = harden({
    vatCreated: () => Date.now() < timeout,
    crankComplete: () => Date.now() < timeout,
    crankFailed: () => Date.now() < timeout,
  });
  return policy;
};
