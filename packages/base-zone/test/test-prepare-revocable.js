// Modeled on test-heap-classes.js

import { test } from './prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { M } from '@endo/patterns';
import { makeHeapZone } from '../src/heap.js';
import { prepareRevocableMakerKit } from '../src/prepare-revocable.js';

const UpCounterI = M.interface('UpCounter', {
  incr: M.call()
    // TODO M.number() should not be needed to get a better error message
    .optional(M.and(M.number(), M.gte(0)))
    .returns(M.number()),
});

const DownCounterI = M.interface('DownCounter', {
  decr: M.call()
    // TODO M.number() should not be needed to get a better error message
    .optional(M.and(M.number(), M.gte(0)))
    .returns(M.number()),
});

test('test revoke defineVirtualExoClass', t => {
  const zone = makeHeapZone('rootZone');

  const makeUnderlyingUpCounter = zone.exoClass(
    'UpCounter',
    UpCounterI,
    /** @param {number} [x] */
    (x = 0) => ({ x }),
    {
      incr(y = 1) {
        const { state } = this;
        state.x += y;
        return state.x;
      },
    },
  );

  const { revoke, makeRevocable } = prepareRevocableMakerKit(
    zone,
    'UpCounter',
    ['incr'],
  );

  const makeUpCounter = x => makeRevocable(makeUnderlyingUpCounter(x));

  const upCounter = makeUpCounter(3);
  t.is(upCounter.incr(5), 8);
  t.is(revoke(upCounter), true);
  t.throws(() => upCounter.incr(1), {
    message: '"UpCounter_caretaker" revoked',
  });
});

test('test revoke defineVirtualExoClassKit', t => {
  const zone = makeHeapZone('rootZone');

  const makeUnderlyingCounterKit = zone.exoClassKit(
    'Counter',
    { up: UpCounterI, down: DownCounterI },
    /** @param {number} [x] */
    (x = 0) => ({ x }),
    {
      up: {
        incr(y = 1) {
          const { state } = this;
          state.x += y;
          return state.x;
        },
      },
      down: {
        decr(y = 1) {
          const { state } = this;
          state.x -= y;
          return state.x;
        },
      },
    },
  );

  const { revoke, makeRevocable } = prepareRevocableMakerKit(
    zone,
    'UpCounter',
    ['incr'],
    {
      extraMethodGuards: {
        selfRevoke: M.call().returns(M.boolean()),
      },
      extraMethods: {
        selfRevoke() {
          // Could directly use the revoker facet instead, but this
          // should now be considered more of an internal detail that
          // we should deemphasize. This tests the code pattern we wish
          // to encourage.
          const { revocable } = this.facets;
          return revoke(revocable);
        },
      },
    },
  );

  const makeCounterKit = x => {
    const { up: upCounter, down: downCounter } = makeUnderlyingCounterKit(x);
    const revocableUpCounter = makeRevocable(upCounter);
    return harden({
      up: revocableUpCounter,
      down: downCounter,
    });
  };

  const { up: upCounter, down: downCounter } = makeCounterKit(3);
  t.is(upCounter.incr(5), 8);
  t.is(downCounter.decr(), 7);
  t.is(upCounter.selfRevoke(), true);
  t.throws(() => upCounter.incr(3), {
    message: '"UpCounter_caretaker" revoked',
  });
  t.is(downCounter.decr(), 6);
});
