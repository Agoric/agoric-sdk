// modeled on test-amplify-heap-class-kits.js
import { test } from './prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { M } from '@endo/patterns';
import {
  defineVirtualExoClass,
  defineVirtualExoClassKit,
} from '../src/exo-utils.js';

const UpCounterI = M.interface('UpCounter', {
  incr: M.call().optional(M.gte(0)).returns(M.number()),
});

const DownCounterI = M.interface('DownCounter', {
  decr: M.call().optional(M.gte(0)).returns(M.number()),
});

test('test amplify defineVirtualExoClass fails', t => {
  t.throws(
    () =>
      defineVirtualExoClass(
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
        {
          receiveAmplifier(_) {},
        },
      ),
    {
      message:
        'Only facets of an exo class kit can be amplified, not "UpCounter"',
    },
  );
});

test('test amplify defineVirtualExoClassKit', t => {
  /** @type {import('@endo/exo').Amplify} */
  let amp;
  const makeCounterKit = defineVirtualExoClassKit(
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
    {
      receiveAmplifier(a) {
        amp = a;
      },
    },
  );
  // @ts-expect-error TS thinks it is used before assigned, which is a hazard
  // TS is correct to bring to our attention, since there is not enough static
  // into to infer otherwise.
  assert(amp !== undefined);

  const counterKit = makeCounterKit(3);
  const { up: upCounter, down: downCounter } = counterKit;
  t.is(upCounter.incr(5), 8);
  t.is(downCounter.decr(), 7);

  t.throws(() => amp(harden({})), {
    message: 'Must be a facet of "Counter": {}',
  });
  t.deepEqual(amp(upCounter), counterKit);
  t.deepEqual(amp(downCounter), counterKit);
});
