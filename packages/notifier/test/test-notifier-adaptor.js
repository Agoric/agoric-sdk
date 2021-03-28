// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import {
  makeAsyncIterableFromNotifier,
  makeNotifierFromAsyncIterable,
  observeIteration,
  observeNotifier,
} from '../src/index';
import {
  finiteStream,
  explodingStream,
  testEnding,
  testManualConsumer,
  testAutoConsumer,
  makeTestIterationObserver,
} from './iterable-testing-tools';

// /////////////// Self test the testing tools for consistency /////////////////

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

test('observeIteration - update from iterator finishes', t => {
  const u = makeTestIterationObserver(t, false, false);
  return observeIteration(finiteStream, u);
});

test('observeIteration - update from iterator fails', t => {
  const u = makeTestIterationObserver(t, false, true);
  return observeIteration(explodingStream, u);
});

// /////////////////////////////// NotifierKit /////////////////////////////////

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

test('notifier adaptor - update from notifier finishes', t => {
  const u = makeTestIterationObserver(t, true, false);
  const n = makeNotifierFromAsyncIterable(finiteStream);
  return observeNotifier(n, u);
});

test('notifier adaptor - update from notifier fails', t => {
  const u = makeTestIterationObserver(t, true, true);
  const n = makeNotifierFromAsyncIterable(explodingStream);
  return observeNotifier(n, u);
});
