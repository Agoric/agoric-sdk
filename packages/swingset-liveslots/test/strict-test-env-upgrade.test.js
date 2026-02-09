/* global globalThis */
// eslint-disable-next-line import/order
import { annihilate, startLife } from '../tools/prepare-strict-test-env.js';

import test from 'ava';

import { makeUpgradeDisconnection } from '@agoric/internal/src/upgrade-api.js';
import { makeExoUtils } from './exo-utils.js';

test.serial('kind redefinition enforced', async t => {
  annihilate();

  const { prepareExoClass } = makeExoUtils(globalThis.VatData);

  await startLife(async baggage => {
    const makeTestExo = prepareExoClass(
      baggage,
      'TestExo',
      undefined,
      () => ({}),
      {
        foo() {
          return 'bar';
        },
      },
    );

    baggage.init('testExo', makeTestExo());
  });

  await t.throwsAsync(
    async () =>
      startLife(async () => {
        // Not redefining the kind here
      }),
    { message: 'defineDurableKind not called for tags: [TestExo]' },
  );

  await startLife(async baggage => {
    prepareExoClass(baggage, 'TestExo', undefined, () => ({}), {
      foo() {
        return 'baz';
      },
    });

    t.is(baggage.get('testExo').foo(), 'baz');
  });
});

test.serial('decided promise rejected', async t => {
  annihilate();

  const { prepareExo } = makeExoUtils(globalThis.VatData);
  const { watchPromise } = globalThis.VatData;

  t.plan(1);

  await startLife(async baggage => {
    const watcher = prepareExo(
      baggage,
      'DurablePromiseTestWatcher',
      undefined,
      {
        onFulfilled(value) {
          t.fail(
            `First incarnation watcher onFulfilled triggered with value ${value}`,
          );
        },
        onRejected(reason) {
          t.fail(
            `First incarnation watcher onRejected triggered with reason ${reason}`,
          );
        },
      },
    );

    const never = harden(new Promise(() => {}));

    watchPromise(never, watcher);
  });

  await startLife(async baggage => {
    prepareExo(baggage, 'DurablePromiseTestWatcher', undefined, {
      onFulfilled(value) {
        t.fail(
          `Second incarnation watcher onFulfilled triggered with value ${value}`,
        );
      },
      onRejected(reason) {
        t.deepEqual(reason, makeUpgradeDisconnection('vat upgraded', 1));
      },
    });
  });
});
