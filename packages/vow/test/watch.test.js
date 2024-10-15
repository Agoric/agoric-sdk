// @ts-check
import test from 'ava';

import { makeHeapZone } from '@agoric/base-zone/heap.js';

import { prepareBasicVowTools } from '../src/tools.js';

/**
 * @import {ExecutionContext} from 'ava'
 * @import {Zone} from '@agoric/base-zone'
 */

/**
 * @param {Zone} zone
 * @param {ExecutionContext<unknown>} t
 */
const prepareAckWatcher = (zone, t) => {
  return zone.exoClass('AckWatcher', undefined, packet => ({ packet }), {
    onFulfilled(ack, ...args) {
      t.is(args.length, 1);
      t.is(args[0], 'watcher context');
      t.is(ack, 'ack');
      return 'fulfilled';
    },
    onRejected(reason, ...args) {
      t.is(args.length, 1);
      t.is(args[0], 'watcher context');
      t.true(reason instanceof Error);
      return 'rejected';
    },
  });
};

/**
 * @param {Zone} zone
 * @param {ExecutionContext<unknown>} t
 */
const prepareArityCheckWatcher = (zone, t) => {
  return zone.exoClass(
    'ArityCheckWatcher',
    undefined,
    expectedArgs => ({ expectedArgs }),
    {
      onFulfilled(value, ...args) {
        t.deepEqual(args, this.state.expectedArgs);
        return 'fulfilled';
      },
      onRejected(reason, ...args) {
        t.deepEqual(args, this.state.expectedArgs);
        return 'rejected';
      },
    },
  );
};

/**
 * @param {Zone} zone
 * @param {ExecutionContext<unknown>} t
 */
test('ack watcher - shim', async t => {
  const zone = makeHeapZone();
  const { watch, when, makeVowKit } = prepareBasicVowTools(zone);
  const makeAckWatcher = prepareAckWatcher(zone, t);

  const packet = harden({ portId: 'port-1', channelId: 'channel-1' });

  const connSendP = Promise.resolve('ack');
  t.is(
    await when(watch(connSendP, makeAckWatcher(packet), 'watcher context')),
    'fulfilled',
  );

  const connErrorP = Promise.reject(Error('disconnected'));
  t.is(
    await when(watch(connErrorP, makeAckWatcher(packet), 'watcher context')),
    'rejected',
  );

  const { vow, resolver } = makeVowKit();
  const connVowP = Promise.resolve(vow);
  resolver.resolve('ack');
  t.is(
    await when(watch(connVowP, makeAckWatcher(packet), 'watcher context')),
    'fulfilled',
  );
  t.is(
    await when(watch(vow, makeAckWatcher(packet), 'watcher context')),
    'fulfilled',
  );

  const { vow: vow2, resolver: resolver2 } = makeVowKit();
  const connVow2P = Promise.resolve(vow2);
  resolver2.resolve(vow);
  t.is(
    await when(watch(connVow2P, makeAckWatcher(packet), 'watcher context')),
    'fulfilled',
  );

  const { vow: vow3, resolver: resolver3 } = makeVowKit();
  const connVow3P = Promise.resolve(vow3);
  resolver3.reject(Error('disco2'));
  resolver3.resolve(vow2);
  t.is(
    await when(watch(connVow3P, makeAckWatcher(packet), 'watcher context')),
    'rejected',
  );
});

/**
 * @param {Zone} zone
 * @param {ExecutionContext<unknown>} t
 */
test('watcher args arity - shim', async t => {
  const zone = makeHeapZone();
  const { watch, when, makeVowKit } = prepareBasicVowTools(zone);
  const makeArityCheckWatcher = prepareArityCheckWatcher(zone, t);

  const testCases = /** @type {const} */ ({
    noArgs: [],
    'single arg': ['testArg'],
    'multiple args': ['testArg1', 'testArg2'],
  });

  for (const [name, args] of Object.entries(testCases)) {
    const fulfillTesterP = Promise.resolve('test');
    t.is(
      await when(watch(fulfillTesterP, makeArityCheckWatcher(args), ...args)),
      'fulfilled',
      `fulfilled promise ${name}`,
    );

    const rejectTesterP = Promise.reject(Error('reason'));
    t.is(
      await when(watch(rejectTesterP, makeArityCheckWatcher(args), ...args)),
      'rejected',
      `rejected promise ${name}`,
    );

    const { vow: vow1, resolver: resolver1 } = makeVowKit();
    const vow1P = Promise.resolve(vow1);
    resolver1.resolve('test');
    t.is(
      await when(watch(vow1, makeArityCheckWatcher(args), ...args)),
      'fulfilled',
      `fulfilled vow ${name}`,
    );
    t.is(
      await when(watch(vow1P, makeArityCheckWatcher(args), ...args)),
      'fulfilled',
      `promise to fulfilled vow ${name}`,
    );

    const { vow: vow2, resolver: resolver2 } = makeVowKit();
    const vow2P = Promise.resolve(vow2);
    resolver2.resolve(vow1);
    t.is(
      await when(watch(vow2P, makeArityCheckWatcher(args), ...args)),
      'fulfilled',
      `promise to vow to fulfilled vow ${name}`,
    );

    const { vow: vow3, resolver: resolver3 } = makeVowKit();
    const vow3P = Promise.resolve(vow3);
    resolver3.reject(Error('disco2'));
    resolver3.resolve(vow2);
    t.is(
      await when(watch(vow3P, makeArityCheckWatcher(args), ...args)),
      'rejected',
      `promise to rejected vow before also resolving to vow ${name}`,
    );
  }
});

test('vow self resolution', async t => {
  const zone = makeHeapZone();
  const { watch, when, makeVowKit } = prepareBasicVowTools(zone);

  // A direct self vow resolution
  const { vow: vow1, resolver: resolver1 } = makeVowKit();
  resolver1.resolve(vow1);

  // A self vow resolution through promise
  const { vow: vow2, resolver: resolver2 } = makeVowKit();
  const vow2P = Promise.resolve(vow2);
  resolver2.resolve(vow2P);

  // A 2 vow loop
  const { vow: vow3, resolver: resolver3 } = makeVowKit();
  const { vow: vow4, resolver: resolver4 } = makeVowKit();
  resolver3.resolve(vow4);
  resolver4.resolve(vow3);

  // A head vow pointing to a 2 vow loop (a lasso?)
  const { vow: vow5, resolver: resolver5 } = makeVowKit();
  resolver5.resolve(vow4);

  const turnTimeout = async n => {
    if (n > 0) {
      return Promise.resolve(n - 1).then(turnTimeout);
    }

    return 'timeout';
  };

  /**
   * @param {number} n
   * @param {Promise<any>} promise
   */
  const raceTurnTimeout = async (n, promise) =>
    Promise.race([promise, turnTimeout(n)]);

  const expectedError = {
    message: 'Vow resolution cycle detected',
  };

  await t.throwsAsync(raceTurnTimeout(20, when(vow1)), expectedError);
  await t.throwsAsync(raceTurnTimeout(20, when(vow2)), expectedError);
  await t.throwsAsync(raceTurnTimeout(20, when(vow3)), expectedError);
  await t.throwsAsync(raceTurnTimeout(20, when(vow5)), expectedError);

  await t.throwsAsync(raceTurnTimeout(20, when(watch(vow1))), expectedError);
  await t.throwsAsync(raceTurnTimeout(20, when(watch(vow2))), expectedError);
  await t.throwsAsync(raceTurnTimeout(20, when(watch(vow3))), expectedError);
  await t.throwsAsync(raceTurnTimeout(20, when(watch(vow5))), expectedError);
});

test('disconnection of non-vow informs watcher', async t => {
  const zone = makeHeapZone();
  const { watch, when } = prepareBasicVowTools(zone, {
    isRetryableReason: reason => reason === 'disconnected',
  });

  // Even though this promise is rejected with a retryable reason, there's no
  // vow before it to retry, so we pass the rejection up to the watcher.
  const vow = watch(
    /* eslint-disable-next-line prefer-promise-reject-errors */
    Promise.reject('disconnected'),
    zone.exo('Watcher', undefined, {
      onFulfilled(value) {
        t.log(`onfulfilled ${value}`);
        t.fail('should not fulfil');
        return 'fulfilled';
      },
      onRejected(reason) {
        t.is(reason, 'disconnected');
        return `rejected ${reason}`;
      },
    }),
  );

  t.is(await when(vow), 'rejected disconnected');
});
