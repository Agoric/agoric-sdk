// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { Far } from '@agoric/marshal';
import { makeNotifierKit } from '@agoric/notifier';
import { makePromiseKit } from '@agoric/promise-kit';

import { refillMeter } from '../../../src/zoeService/refillMeter.js';

test('refillMeter', async t => {
  const feePurse = /** @type {FeePurse} */ (Far('feePurse', {}));
  const chargeForComputrons = async _feePurse => 10n;
  const notifierKit = makeNotifierKit();
  const deltaPromiseKit = makePromiseKit();
  const meter = Far('meter', {
    getNotifier: () => notifierKit.notifier,
    addRemaining: delta => deltaPromiseKit.resolve(delta),
  });
  // @ts-ignore Mocked for testing
  refillMeter(meter, chargeForComputrons, feePurse);
  notifierKit.updater.updateState('first');
  const delta = await deltaPromiseKit.promise;
  t.is(delta, 10n);
});
