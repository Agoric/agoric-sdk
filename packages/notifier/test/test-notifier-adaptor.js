// @ts-check
import '@agoric/install-ses';
import test from 'ava';
import {
  makeAsyncIterableFromNotifier,
  makeNotifierFromAsyncIterable,
  updateFromIterable,
  updateFromNotifier,
} from '../src/index';
import {
  finiteStream,
  explodingStream,
  testEnding,
  testManualConsumer,
  testAutoConsumer,
  makeTestUpdater,
} from './iterable-testing-tools';

test('async iterator - manual finishes', async t => {
  const p = testManualConsumer(t, finiteStream, false);
  return testEnding(t, p, false);
});

test('async iterator - manual fails', async t => {
  const p = testManualConsumer(t, explodingStream, false);
  return testEnding(t, p, true);
});

test('async iterator - for await finishes', async t => {
  const p = testAutoConsumer(t, finiteStream, false);
  return testEnding(t, p, false);
});

test('async iterator - for await fails', async t => {
  const p = testAutoConsumer(t, explodingStream, false);
  return testEnding(t, p, true);
});

test('notifier adaptor - manual finishes', async t => {
  const n = makeNotifierFromAsyncIterable(finiteStream);
  const finiteUpdates = makeAsyncIterableFromNotifier(n);
  const p = testManualConsumer(t, finiteUpdates, true);
  return testEnding(t, p, false);
});

test('notifier adaptor - manual fails', async t => {
  const n = makeNotifierFromAsyncIterable(explodingStream);
  const explodingUpdates = makeAsyncIterableFromNotifier(n);
  const p = testManualConsumer(t, explodingUpdates, true);
  return testEnding(t, p, true);
});

test('notifier adaptor - for await finishes', async t => {
  const n = makeNotifierFromAsyncIterable(finiteStream);
  const finiteUpdates = makeAsyncIterableFromNotifier(n);
  const p = testAutoConsumer(t, finiteUpdates, true);
  return testEnding(t, p, false);
});

test('notifier adaptor - for await fails', async t => {
  const n = makeNotifierFromAsyncIterable(explodingStream);
  const explodingUpdates = makeAsyncIterableFromNotifier(n);
  const p = testAutoConsumer(t, explodingUpdates, true);
  return testEnding(t, p, true);
});

test('notifier adaptor - update from iterator finishes', t => {
  const u = makeTestUpdater(t, false, false);
  return updateFromIterable(u, finiteStream);
});

test('notifier adaptor - update from iterator fails', t => {
  const u = makeTestUpdater(t, false, true);
  return updateFromIterable(u, explodingStream);
});

test('notifier adaptor - update from notifier finishes', t => {
  const u = makeTestUpdater(t, true, false);
  const n = makeNotifierFromAsyncIterable(finiteStream);
  return updateFromNotifier(u, n);
});

test('notifier adaptor - update from notifier fails', t => {
  const u = makeTestUpdater(t, true, true);
  const n = makeNotifierFromAsyncIterable(explodingStream);
  return updateFromNotifier(u, n);
});
