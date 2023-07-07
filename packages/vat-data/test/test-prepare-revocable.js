// Modeled on test-revoke-heap-classes.js

import { test } from './prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { M } from '@agoric/store';
import { prepareExoClass, prepareExoClassKit } from '../src/exo-utils.js';
import { makeScalarBigMapStore } from '../src/vat-data-bindings.js';
import { prepareRevocableKit } from '../src/prepare-revocable.js';

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
  const baggage = makeScalarBigMapStore('fakeRootBaggage');

  const makeUnderlyingUpCounter = prepareExoClass(
    baggage,
    'UpCounter',
    UpCounterI,
    /** @param {number} x */
    (x = 0) => ({ x }),
    {
      incr(y = 1) {
        const { state } = this;
        state.x += y;
        return state.x;
      },
    },
  );

  const makeRevocableUpCounterKit = prepareRevocableKit(
    baggage,
    'UpCounter',
    'UpCounter',
    ['incr'],
  );

  const makeUpCounterKit = x =>
    makeRevocableUpCounterKit(makeUnderlyingUpCounter(x));

  const { revoker, revocable: upCounter } = makeUpCounterKit(3);
  t.is(upCounter.incr(5), 8);
  t.is(revoker.revoke(), true);
  t.throws(() => upCounter.incr(1), {
    message: '"UpCounter_caretaker" revoked',
  });
});

test('test revoke defineVirtualExoClassKit', t => {
  const baggage = makeScalarBigMapStore('fakeRootBaggage');

  const makeUnderlyingCounterKit = prepareExoClassKit(
    baggage,
    'Counter',
    { up: UpCounterI, down: DownCounterI },
    /** @param {number} x */
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

  const makeRevocableUpCounterKit = prepareRevocableKit(
    baggage,
    'UpCounter',
    'UpCounter',
    ['incr'],
    {
      selfRevoke: M.call().returns(M.boolean()),
    },
    {
      selfRevoke() {
        const {
          facets: {
            // @ts-expect-error typing this
            revoker,
          },
        } = this;
        return revoker.revoke();
      },
    },
  );

  const makeCounterKit = x => {
    const { up: upCounter, down: downCounter } = makeUnderlyingCounterKit(x);
    const { revocable: revocableUpCounter } =
      makeRevocableUpCounterKit(upCounter);
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
