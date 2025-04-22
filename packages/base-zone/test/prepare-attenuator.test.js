// Modeled on test-heap-classes.js

import { test } from './prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { M } from '@endo/patterns';
import { makeHeapZone } from '../src/heap.js';
import { prepareAttenuatorMaker } from '../src/prepare-attenuator.js';

const CounterI = M.interface('Counter', {
  incr: M.call()
    // TODO M.number() should not be needed to get a better error message
    .optional(M.and(M.number(), M.gte(0)))
    .returns(M.number()),
  decr: M.call()
    // TODO M.number() should not be needed to get a better error message
    .optional(M.and(M.number(), M.gte(0)))
    .returns(M.number()),
});

test('test attenuate defineVirtualExoClass', t => {
  const zone = makeHeapZone('rootZone');

  const makeUnderlyingCounter = zone.exoClass(
    'Counter',
    CounterI,
    /** @param {number} [x] */
    (x = 0) => ({ x }),
    {
      incr(y = 1) {
        const { state } = this;
        state.x += y;
        return state.x;
      },
      decr(y = 1) {
        const { state } = this;
        state.x -= y;
        return state.x;
      },
    },
  );

  const makeUpAttenuator = prepareAttenuatorMaker(zone, 'UpCounter', ['incr']);

  const makeUpCounter = x => makeUpAttenuator(makeUnderlyingCounter(x));

  const upCounter = makeUpCounter(3);
  t.is(upCounter.incr(5), 8);
  t.throws(() => upCounter.decr(1), {
    message: 'upCounter.decr is not a function',
  });
});

test('test revoke defineVirtualExoClassKit', t => {
  const zone = makeHeapZone('rootZone');

  const makeUnderlyingCounter = zone.exoClass(
    'Counter',
    CounterI,
    /** @param {number} [x] */
    (x = 0) => ({ x }),
    {
      incr(y = 1) {
        const { state } = this;
        state.x += y;
        return state.x;
      },
      decr(y = 1) {
        const { state } = this;
        state.x -= y;
        return state.x;
      },
    },
  );

  const makeDownAttenuator = prepareAttenuatorMaker(
    zone,
    'DownCounter',
    ['decr'],
    {
      extraMethodGuards: {
        selfRevoke: M.call().returns(M.boolean()),
      },
      extraMethods: {
        selfRevoke() {
          const { state } = this;
          if (state.underlying === undefined) {
            return false;
          }
          state.underlying = undefined;
          return true;
        },
      },
    },
  );

  const makeDownCounter = x => makeDownAttenuator(makeUnderlyingCounter(x));

  const downCounter = makeDownCounter(3);
  t.throws(() => downCounter.incr(1), {
    message: 'downCounter.incr is not a function',
  });
  t.is(downCounter.decr(), 2);
  t.is(downCounter.selfRevoke(), true);
  t.throws(() => downCounter.decr(3), {
    message: '"DownCounter_attenuator" revoked',
  });
});
