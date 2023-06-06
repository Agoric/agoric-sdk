// Modeled on test-revoke-heap-classes.js

import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { M } from '@agoric/store';
import {
  defineVirtualExoClass,
  defineVirtualExoClassKit,
} from '../src/exo-utils.js';

const { apply } = Reflect;

const UpCounterI = M.interface('UpCounter', {
  incr: M.call()
    // TODO M.number() should not be needed to get a better error message
    .optional(M.and(M.number(), M.gte(0)))
    .returns(M.number()),
  done: M.call().returns(M.boolean()),
});

const DownCounterI = M.interface('DownCounter', {
  decr: M.call()
    // TODO M.number() should not be needed to get a better error message
    .optional(M.and(M.number(), M.gte(0)))
    .returns(M.number()),
});

test('test revoke defineVirtualExoClass', t => {
  const makeUpCounter = defineVirtualExoClass(
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
      done() {
        const { self, revoke } = this;
        return revoke(self);
      },
    },
  );
  const upCounter = makeUpCounter(3);
  t.is(upCounter.incr(5), 8);
  t.is(upCounter.done(), true);
  t.throws(() => upCounter.incr(1), {
    message:
      '"In \\"incr\\" method of (UpCounter)" may only be applied to a valid instance: "[Alleged: UpCounter]"',
  });
});

test('test revoke defineVirtualExoClassKit', t => {
  const makeCounterKit = defineVirtualExoClassKit(
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
        done() {
          const {
            facets: { down },
            revoke,
          } = this;
          return revoke(down);
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
  const { up: upCounter, down: downCounter } = makeCounterKit(3);
  t.is(upCounter.incr(5), 8);
  t.is(downCounter.decr(), 7);
  t.is(upCounter.done(), true);
  t.throws(() => upCounter.incr(3), {
    message:
      '"In \\"incr\\" method of (Counter up)" may only be applied to a valid instance: "[Alleged: Counter up]"',
  });
  t.throws(() => downCounter.decr(), {
    message:
      '"In \\"decr\\" method of (Counter down)" may only be applied to a valid instance: "[Alleged: Counter down]"',
  });
});

test('test virtual facet cross-talk', t => {
  const makeCounterKit = defineVirtualExoClassKit(
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
        done() {
          const {
            facets: { down },
            revoke,
          } = this;
          return revoke(down);
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
  const { up: upCounter, down: downCounter } = makeCounterKit(3);
  t.throws(() => apply(upCounter.incr, downCounter, [2]), {
    message: 'illegal cross-facet access',
  });
});
