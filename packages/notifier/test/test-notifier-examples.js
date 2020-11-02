// @ts-check
import '@agoric/install-ses';
import { E } from '@agoric/eventual-send';
import test from 'ava';
import { observeIteration, makeNotifierKit, makeNotifier } from '../src/index';
import { paula, alice, bob } from './iterable-testing-tools';

import '../src/types';

const last = array => array[array.length - 1];

test('notifier for-await-of success example', async t => {
  const { updater, notifier } = makeNotifierKit();
  paula(updater);
  const log = await alice(notifier);

  t.deepEqual(last(log), ['finished']);
});

test('notifier observeIteration success example', async t => {
  const { updater, notifier } = makeNotifierKit();
  paula(updater);
  const log = await bob(notifier);

  t.deepEqual(last(log), ['finished', 'done']);
});

test('notifier for-await-of cannot eat promise', async t => {
  const { updater, notifier } = makeNotifierKit();
  paula(updater);
  const subP = Promise.resolve(notifier);
  const log = await alice(subP);

  // This TypeError is thrown by JavaScript when a for-await-in loop
  // attempts to iterate a promise that is not an async iterable.
  t.is(log[0][0], 'failed');
  t.assert(log[0][1] instanceof TypeError);
});

test('notifier observeIteration can eat promise', async t => {
  const { updater, notifier } = makeNotifierKit();
  paula(updater);
  const subP = Promise.resolve(notifier);
  const log = await bob(subP);

  t.deepEqual(last(log), ['finished', 'done']);
});

test('notifier for-await-of on local representative', async t => {
  const { updater, notifier } = makeNotifierKit();
  paula(updater);
  const subP = Promise.resolve(notifier);
  const localSub = makeNotifier(E(subP).getSharableNotifierInternals());
  const log = await alice(localSub);

  t.deepEqual(last(log), ['finished']);
});

test('notifier observeIteration on local representative', async t => {
  const { updater, notifier } = makeNotifierKit();
  paula(updater);
  const subP = Promise.resolve(notifier);
  const localSub = makeNotifier(E(subP).getSharableNotifierInternals());
  const log = await bob(localSub);

  t.deepEqual(last(log), ['finished', 'done']);
});

test('notifier for-await-of on generic representative', async t => {
  const { updater, notifier } = makeNotifierKit();
  paula(updater);
  const subP = Promise.resolve(notifier);
  const { updater: p, notifier: localSub } = makeNotifierKit();
  observeIteration(subP, p);
  const log = await alice(localSub);

  t.deepEqual(last(log), ['finished']);
});

test('notifier observeIteration on generic representative', async t => {
  const { updater, notifier } = makeNotifierKit();
  paula(updater);
  const subP = Promise.resolve(notifier);
  const { updater: p, notifier: localSub } = makeNotifierKit();
  observeIteration(subP, p);
  const log = await bob(localSub);

  t.deepEqual(last(log), ['finished', 'done']);
});
