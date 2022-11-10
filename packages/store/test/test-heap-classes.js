import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import {
  defineHeapFarClass,
  defineHeapFarClassKit,
  makeHeapFarInstance,
} from '../src/patterns/interface-tools.js';
import { M } from '../src/patterns/patternMatchers.js';

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

test('test defineHeapFarClass', t => {
  const makeUpCounter = defineHeapFarClass(
    'UpCounter',
    UpCounterI,
    (x = 0) => ({ x }),
    {
      incr(y = 1) {
        // @ts-expect-error TS doesn't know that `this` is a `Context`
        const { state } = this;
        state.x += y;
        return state.x;
      },
    },
  );
  const upCounter = makeUpCounter(3);
  t.is(upCounter.incr(5), 8);
  t.is(upCounter.incr(1), 9);
  t.throws(() => upCounter.incr(-3), {
    message: 'In "incr" method of (UpCounter) arg 0: -3 - Must be >= 0',
  });
  // @ts-expect-error bad arg
  t.throws(() => upCounter.incr('foo'), {
    message:
      'In "incr" method of (UpCounter) arg 0: string "foo" - Must be a number',
  });
});

test('test defineHeapFarClassKit', t => {
  const makeCounterKit = defineHeapFarClassKit(
    'Counter',
    { up: UpCounterI, down: DownCounterI },
    (x = 0) => ({ x }),
    {
      up: {
        incr(y = 1) {
          // @ts-expect-error xxx this.state
          const { state } = this;
          state.x += y;
          return state.x;
        },
      },
      down: {
        decr(y = 1) {
          // @ts-expect-error xxx this.state
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
  t.is(upCounter.incr(3), 10);
  t.throws(() => upCounter.incr(-3), {
    message: 'In "incr" method of (Counter up) arg 0: -3 - Must be >= 0',
  });
  // @ts-expect-error the type violation is what we're testing
  t.throws(() => downCounter.decr('foo'), {
    message:
      'In "decr" method of (Counter down) arg 0: string "foo" - Must be a number',
  });
  // @ts-expect-error bad arg
  t.throws(() => upCounter.decr(3), {
    message: 'upCounter.decr is not a function',
  });
});

test('test makeHeapFarInstance', t => {
  let x = 3;
  const upCounter = makeHeapFarInstance('upCounter', UpCounterI, {
    incr(y = 1) {
      x += y;
      return x;
    },
  });
  t.is(upCounter.incr(5), 8);
  t.is(upCounter.incr(1), 9);
  t.throws(() => upCounter.incr(-3), {
    message: 'In "incr" method of (upCounter) arg 0: -3 - Must be >= 0',
  });
  t.throws(() => upCounter.incr('foo'), {
    message:
      'In "incr" method of (upCounter) arg 0: string "foo" - Must be a number',
  });
});

// needn't run. we just don't have a better place to write these.
test.skip('types', () => {
  // any methods can be defined if there's no interface
  const unguarded = makeHeapFarInstance('upCounter', undefined, {
    /** @param {number} val */
    incr(val) {
      return val;
    },
    notInInterface() {
      return 0;
    },
  });
  // @ts-expect-error invalid args
  unguarded.incr();
  unguarded.notInInterface();
  // @ts-expect-error not defined
  unguarded.notInBehavior;

  // TODO when there is an interface, error if a method is missing from it
  const guarded = makeHeapFarInstance('upCounter', UpCounterI, {
    /** @param {number} val */
    incr(val) {
      return val;
    },
    notInInterface() {
      return 0;
    },
  });
  // @ts-expect-error invalid args
  guarded.incr();
  guarded.notInInterface();
  // @ts-expect-error not defined
  guarded.notInBehavior;
});
