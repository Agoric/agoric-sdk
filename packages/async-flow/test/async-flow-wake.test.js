// The purpose of this test file is to demonstrate various wake behavior: if a
// flow is either an eager waker or in a failed state it should be awoken in a
// new incarnation, but otherwise should wait until a wake watcher is triggered.

import { Fail } from '@endo/errors';
import { testAsyncLife } from './prepare-test-env-ava.js';

/**
 * @import {Vow} from '@agoric/vow';
 */

/** @param {Pick<import('./prepare-test-env-ava.js').AsyncLifeTools, 'makeVowKit' | 'zone'>} tools */
const makeTestKit = ({ zone, makeVowKit }) => {
  const { resolver, vow } = zone.makeOnce('trigger', makeVowKit);
  const waiter = zone.exo('arg', undefined, {
    wait(_ignoredArg) {
      return vow;
    },
  });
  return { resolver, waiter };
};

testAsyncLife(
  'setup',
  async (t, { zone, asyncFlow, makeVowKit }) => {
    t.plan(2);
    const { waiter } = makeTestKit({ zone, makeVowKit });
    const guestFunc = async w => {
      t.pass();
      return w.wait('foo');
    };

    const wrapperFunc = asyncFlow(zone, 'guestFunc', guestFunc, {
      startEager: false,
    });

    return { zone, wrapperFunc, waiter };
  },
  async (t, { zone, wrapperFunc, waiter }) => {
    zone.makeOnce('result', () => wrapperFunc(waiter));
    t.pass();
  },
);

testAsyncLife(
  'not eager waker stay sleeping',
  async (t, { zone, asyncFlow, makeVowKit }) => {
    t.plan(1);
    makeTestKit({ zone, makeVowKit });
    const guestFunc = async _ => t.fail(`Should not restart`);

    t.notThrows(() =>
      asyncFlow(zone, 'guestFunc', guestFunc, {
        // Ignored for existing invocation since it doesn't restart
        startEager: true,
      }),
    );
  },
);

testAsyncLife(
  'not eager waker stay sleeping 2',
  async (t, { zone, asyncFlow, makeVowKit }) => {
    t.plan(1);
    makeTestKit({ zone, makeVowKit });
    const guestFunc = async _ => t.fail(`Should not have become eager waker`);

    t.notThrows(() => asyncFlow(zone, 'guestFunc', guestFunc));
  },
);

testAsyncLife(
  'forced restart',
  async (t, { zone, asyncFlow, makeVowKit, adminAsyncFlow }) => {
    t.plan(2);
    makeTestKit({ zone, makeVowKit });
    const guestFunc = async w => {
      t.pass();
      return w.wait('foo');
    };

    t.notThrows(() => asyncFlow(zone, 'guestFunc', guestFunc));
    return { zone, adminAsyncFlow };
  },
  async (t, { zone, adminAsyncFlow }) => {
    /** @type {Vow<string>} */
    const result = zone.makeOnce('result', () => Fail`result must exist`);
    const flow = adminAsyncFlow.getFlowForOutcomeVow(result);
    // Force restart and set as eager waker for next incarnation
    flow.restart(true);
  },
);

testAsyncLife(
  'eager waker panic',
  async (t, { zone, asyncFlow, makeVowKit }) => {
    // The panic handler should be triggered because of a bad replay
    t.plan(3);
    makeTestKit({ zone, makeVowKit });
    const guestFunc = async w => {
      t.pass();
      return w.wait('bar');
    };

    t.notThrows(() =>
      asyncFlow(zone, 'guestFunc', guestFunc, {
        // Next incarnation should not be eager, only restart because failed
        startEager: false,
      }),
    );
  },
  undefined,
  {
    panicHandler: (e, t) => {
      t.throws(
        () => {
          throw e;
        },
        { message: /unequal "bar" vs "foo"$/ },
      );
    },
  },
);

testAsyncLife.failing(
  'failed wake',
  async (t, { zone, asyncFlow, makeVowKit, allWokenP }) => {
    t.plan(2);
    // Spend a bunch of turns to pretend any concurrent async operation has settled
    // Triggers https://github.com/Agoric/agoric-sdk/issues/9377
    for (let i = 0; i < 100; i += 1) {
      await null;
    }

    makeTestKit({ zone, makeVowKit });
    const guestFunc = async w => {
      t.pass('not triggered - invocation cannot be awoken');
      return w.wait('foo');
    };
    t.notThrows(() =>
      asyncFlow(zone, 'guestFunc', guestFunc, {
        // Next incarnation should not start eager
        startEager: false,
      }),
    );

    return { allWokenP };
  },
  async (t, { allWokenP }) => {
    await t.notThrowsAsync(
      () => allWokenP,
      'will actually throw due to crank bug #9377',
    );
  },
);

testAsyncLife(
  'failed wake redo',
  async (t, { zone, asyncFlow, makeVowKit }) => {
    t.plan(2);
    makeTestKit({ zone, makeVowKit });
    const guestFunc = async w => {
      t.pass();
      return w.wait('foo');
    };
    t.notThrows(() =>
      asyncFlow(zone, 'guestFunc', guestFunc, {
        // Next incarnation should not start eager
        startEager: false,
      }),
    );
  },
);

testAsyncLife(
  'not eager waker stay sleeping 3',
  async (t, { zone, asyncFlow, makeVowKit }) => {
    t.plan(1);
    makeTestKit({ zone, makeVowKit });
    const guestFunc = async _ => t.fail(`Should not restart`);

    t.notThrows(() =>
      asyncFlow(zone, 'guestFunc', guestFunc, {
        // Ignored for existing invocation since it doesn't restart
        startEager: true,
      }),
    );
  },
);

testAsyncLife(
  'sleeping wake on watch',
  async (t, { zone, when, asyncFlow, makeVowKit }) => {
    t.plan(4);
    const { resolver } = makeTestKit({ zone, makeVowKit });
    const guestCalled = { tripped: false };
    const guestFunc = async w => {
      guestCalled.tripped = true;
      return w.wait('foo');
    };
    t.notThrows(() =>
      asyncFlow(zone, 'guestFunc', guestFunc, { startEager: false }),
    );

    return { zone, when, resolver, guestCalled };
  },
  async (t, { zone, when, resolver, guestCalled }) => {
    /** @type {Vow<string>} */
    const result = zone.makeOnce('result', () => Fail`result must exist`);
    resolver.resolve('success');
    t.is(guestCalled.tripped, false, 'flow is sleeping');
    t.is(
      await when(result),
      'success',
      'flow must have got awoken after panic',
    );
    t.is(guestCalled.tripped, true, 'flow woke up');
  },
);
