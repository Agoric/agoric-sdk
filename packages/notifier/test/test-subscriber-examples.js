// @ts-check

import { test } from './prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import {
  observeIteration,
  makeSubscriptionKit,
  shadowSubscription,
} from '../src/index.js';
import { paula, alice, bob, carol } from './iterable-testing-tools.js';

import '../src/types.js';

// TODO Update the tests marked `test.skip` to take prefix lossiness into
// account.

test.skip('subscription for-await-of success example', async t => {
  const { publication, subscription } = makeSubscriptionKit();
  paula(publication);
  const log = await alice(subscription);

  t.deepEqual(log, [['non-final', 'a'], ['non-final', 'b'], ['finished']]);
});

test.skip('subscription observeIteration success example', async t => {
  const { publication, subscription } = makeSubscriptionKit();
  paula(publication);
  const log = await bob(subscription);

  t.deepEqual(log, [
    ['non-final', 'a'],
    ['non-final', 'b'],
    ['finished', 'done'],
  ]);
});

test('subscription for-await-of cannot eat promise', async t => {
  const { publication, subscription } = makeSubscriptionKit();
  paula(publication);
  const subP = Promise.resolve(subscription);
  // Type cast because this test demonstrates the failure that results from
  // giving Alice a promise for a subscription.
  const log = await alice(/** @type {any} */ (subP));

  // This TypeError is thrown by JavaScript when a for-await-in loop
  // attempts to iterate a promise that is not an async iterable.
  t.is(log[0][0], 'failed');
  t.assert(log[0][1] instanceof TypeError);
});

test.skip('subscription observeIteration can eat promise', async t => {
  const { publication, subscription } = makeSubscriptionKit();
  paula(publication);
  const subP = Promise.resolve(subscription);
  const log = await bob(subP);

  t.deepEqual(log, [
    ['non-final', 'a'],
    ['non-final', 'b'],
    ['finished', 'done'],
  ]);
});

test.skip('subscription for-await-of on local representative', async t => {
  const { publication, subscription } = makeSubscriptionKit();
  paula(publication);
  const subP = Promise.resolve(subscription);
  const localSub = shadowSubscription(subP);
  const log = await alice(localSub);

  t.deepEqual(log, [['non-final', 'a'], ['non-final', 'b'], ['finished']]);
});

test.skip('subscription observeIteration on local representative', async t => {
  const { publication, subscription } = makeSubscriptionKit();
  paula(publication);
  const subP = Promise.resolve(subscription);
  const localSub = shadowSubscription(subP);
  const log = await bob(localSub);

  t.deepEqual(log, [
    ['non-final', 'a'],
    ['non-final', 'b'],
    ['finished', 'done'],
  ]);
});

test.skip('subscription for-await-of on generic representative', async t => {
  const { publication, subscription } = makeSubscriptionKit();
  paula(publication);
  const subP = Promise.resolve(subscription);
  const { publication: p, subscription: localSub } = makeSubscriptionKit();
  observeIteration(subP, p);
  const log = await alice(localSub);

  t.deepEqual(log, [['non-final', 'a'], ['non-final', 'b'], ['finished']]);
});

test.skip('subscription observeIteration on generic representative', async t => {
  const { publication, subscription } = makeSubscriptionKit();
  paula(publication);
  const subP = Promise.resolve(subscription);
  const { publication: p, subscription: localSub } = makeSubscriptionKit();
  observeIteration(subP, p);
  const log = await bob(localSub);

  t.deepEqual(log, [
    ['non-final', 'a'],
    ['non-final', 'b'],
    ['finished', 'done'],
  ]);
});

// /////////////////////////////////////////////////////////////////////////////
// Carol is specific to subscription, so there is nothing analogous to the
// following in test-notifier-examples

test.skip('subscribe to subscriptionIterator success example', async t => {
  const { publication, subscription } = makeSubscriptionKit();
  paula(publication);
  const log = await carol(subscription);

  t.deepEqual(log, [
    [
      ['non-final', 'a'],
      ['non-final', 'b'],
      ['finished', 'done'],
    ],
    [
      ['non-final', 'b'],
      ['finished', 'done'],
    ],
  ]);
});
