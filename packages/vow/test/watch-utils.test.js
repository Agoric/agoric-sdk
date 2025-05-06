// @ts-check
/* global setTimeout */
import test from 'ava';

import { makeHeapZone } from '@agoric/base-zone/heap.js';
import { E, getInterfaceOf } from '@endo/far';

import { prepareBasicVowTools } from '../src/tools.js';

const setTimeoutAmbient = setTimeout;

test('vowTools.all waits for a single vow to complete', async t => {
  const zone = makeHeapZone();
  const { watch, when, all } = prepareBasicVowTools(zone);

  const testPromiseP = Promise.resolve('promise');
  const vowA = watch(testPromiseP);

  const result = await when(all([vowA]));
  t.is(result.length, 1);
  t.is(result[0], 'promise');
});

test('vowTools.all waits for an array of vows to complete', async t => {
  const zone = makeHeapZone();
  const { watch, when, all } = prepareBasicVowTools(zone);

  const testPromiseAP = Promise.resolve('promiseA');
  const testPromiseBP = Promise.resolve('promiseB');
  const testPromiseCP = Promise.resolve('promiseC');
  const vowA = watch(testPromiseAP);
  const vowB = watch(testPromiseBP);
  const vowC = watch(testPromiseCP);

  const result = await when(all([vowA, vowB, vowC]));
  t.is(result.length, 3);
  t.like(result, ['promiseA', 'promiseB', 'promiseC']);
});

test('vowTools.all returns vows in order', async t => {
  const zone = makeHeapZone();
  const { watch, when, all, makeVowKit } = prepareBasicVowTools(zone);
  const kit = makeVowKit();

  const testPromiseAP = Promise.resolve('promiseA');
  const testPromiseBP = Promise.resolve('promiseB');
  const vowA = watch(testPromiseAP);
  const vowB = watch(testPromiseBP);
  const vowC = watch(kit.vow);

  // test promie A and B should already be resolved.
  kit.resolver.resolve('promiseC');

  const result = await when(all([vowA, vowC, vowB]));
  t.is(result.length, 3);
  t.like(result, ['promiseA', 'promiseC', 'promiseB']);
});

test('vowTools.all rejects upon first rejection', async t => {
  const zone = makeHeapZone();
  const { watch, when, all } = prepareBasicVowTools(zone);

  const testPromiseAP = Promise.resolve('promiseA');
  const testPromiseBP = Promise.reject(Error('rejectedA'));
  const testPromiseCP = Promise.reject(Error('rejectedB'));
  const vowA = watch(testPromiseAP);
  const vowB = watch(testPromiseBP);
  const vowC = watch(testPromiseCP);

  const watcher = zone.exo('RejectionWatcher', undefined, {
    onRejected(e) {
      t.is(e.message, 'rejectedA');
    },
  });

  await when(watch(all([vowA, vowB, vowC]), watcher));
});

test('vowTools.all can accept vows awaiting other vows', async t => {
  const zone = makeHeapZone();
  const { watch, when, all } = prepareBasicVowTools(zone);

  const testPromiseAP = Promise.resolve('promiseA');
  const testPromiseBP = Promise.resolve('promiseB');
  const vowA = watch(testPromiseAP);
  const vowB = watch(testPromiseBP);
  const resultA = all([vowA, vowB]);

  const testPromiseCP = Promise.resolve('promiseC');
  const vowC = when(watch(testPromiseCP));
  const resultB = await when(all([resultA, vowC]));

  t.is(resultB.length, 2);
  t.like(resultB, [['promiseA', 'promiseB'], 'promiseC']);
});

test('vowTools.all - works with just promises', async t => {
  const zone = makeHeapZone();
  const { when, all } = prepareBasicVowTools(zone);

  const result = await when(
    all([Promise.resolve('promiseA'), Promise.resolve('promiseB')]),
  );
  t.is(result.length, 2);
  t.like(result, ['promiseA', 'promiseB']);
});

test('vowTools.all - watch promises mixed with vows', async t => {
  const zone = makeHeapZone();
  const { watch, when, all } = prepareBasicVowTools(zone);

  const testPromiseP = Promise.resolve('vow');
  const vowA = watch(testPromiseP);

  const result = await when(all([vowA, Promise.resolve('promise')]));
  t.is(result.length, 2);
  t.like(result, ['vow', 'promise']);
});

test('vowTools.all can accept passable data (PureData)', async t => {
  const zone = makeHeapZone();
  const { when, all } = prepareBasicVowTools(zone);

  const result = await when(
    all([Promise.resolve('promise'), 'string', 1n, { obj: true }]),
  );
  t.is(result.length, 4);
  t.deepEqual(result, ['promise', 'string', 1n, { obj: true }]);
});

test('vowTools.all rejects on the first settled rejection', async t => {
  const zone = makeHeapZone();
  const { when, all } = prepareBasicVowTools(zone);

  await t.throwsAsync(
    when(
      all([
        Promise.resolve('yes'),
        Promise.reject(new Error('no')),
        Promise.reject(new Error('no again')),
      ]),
    ),
    { message: 'no' },
  );
});

const prepareAccount = zone =>
  zone.exoClass('Account', undefined, address => ({ address }), {
    getAddress() {
      return Promise.resolve(this.state.address);
    },
  });

test('vowTools.all supports Promise pipelining', async t => {
  const zone = makeHeapZone();
  const { watch, when, all } = prepareBasicVowTools(zone);

  // makeAccount returns a Promise
  const prepareLocalChain = makeAccount => {
    const localchainMock = zone.exoClass(
      'Localchain',
      undefined,
      () => ({ accountIndex: 0 }),
      {
        makeAccount() {
          this.state.accountIndex += 1;
          return Promise.resolve(
            makeAccount(`agoric1foo${this.state.accountIndex}`),
          );
        },
      },
    );
    return localchainMock();
  };

  const Localchain = prepareLocalChain(prepareAccount(zone));
  const lcaP = E(Localchain).makeAccount();
  const results = await when(watch(all([lcaP, E(lcaP).getAddress()])));
  t.is(results.length, 2);
  const [acct, address] = results;
  t.is(getInterfaceOf(acct), 'Alleged: Account');
  t.is(
    address,
    'agoric1foo1',
    'pipelining does not result in multiple instantiations',
  );
});

test('vowTools.all does NOT support Vow pipelining', async t => {
  const zone = makeHeapZone();
  const { watch, when, all } = prepareBasicVowTools(zone);

  // makeAccount returns a Vow
  const prepareLocalChainVowish = makeAccount => {
    const localchainMock = zone.exoClass(
      'Localchain',
      undefined,
      () => ({ accountIndex: 0 }),
      {
        makeAccount() {
          this.state.accountIndex += 1;
          return watch(
            Promise.resolve(
              makeAccount(`agoric1foo${this.state.accountIndex}`),
            ),
          );
        },
      },
    );
    return localchainMock();
  };
  const Localchain = prepareLocalChainVowish(prepareAccount(zone));
  const lcaP = E(Localchain).makeAccount();
  // @ts-expect-error Property 'getAddress' does not exist on type
  // 'EMethods<Required<PassStyled<"tagged", "Vow"> & { payload: VowPayload<any>; }>>'.
  await t.throwsAsync(when(watch(all([lcaP, E(lcaP).getAddress()]))), {
    message: 'target has no method "getAddress", has []',
  });
});

test('asPromise converts a vow to a promise', async t => {
  const zone = makeHeapZone();
  const { watch, asPromise } = prepareBasicVowTools(zone);

  const testPromiseP = Promise.resolve('test value');
  const vow = watch(testPromiseP);

  const result = await asPromise(vow);
  t.is(result, 'test value');
});

test('asPromise handles vow rejection', async t => {
  const zone = makeHeapZone();
  const { watch, asPromise } = prepareBasicVowTools(zone);

  const testPromiseP = Promise.reject(Error('test error'));
  const vow = watch(testPromiseP);

  await t.throwsAsync(asPromise(vow), { message: 'test error' });
});

test('asPromise accepts and resolves promises', async t => {
  const zone = makeHeapZone();
  const { asPromise } = prepareBasicVowTools(zone);

  const p = Promise.resolve('a promise');
  const result = await asPromise(p);
  t.is(result, 'a promise');
});

test('asPromise handles watcher arguments', async t => {
  const zone = makeHeapZone();
  const { watch, asPromise } = prepareBasicVowTools(zone);

  const testPromiseP = Promise.resolve('watcher test');
  const vow = watch(testPromiseP);

  let watcherCalled = false;
  const watcher = zone.exo('Watcher', undefined, {
    onFulfilled(value, ctx) {
      watcherCalled = true;
      t.is(value, 'watcher test');
      t.deepEqual(ctx, ['ctx']);
      return value;
    },
  });

  // XXX fix type: `watcherContext` doesn't need to be an array
  const result = await asPromise(vow, watcher, ['ctx']);
  t.is(result, 'watcher test');
  t.true(watcherCalled);
});

test('vowTools.all handles unstorable results', async t => {
  const zone = makeHeapZone();
  const { watch, when, all } = prepareBasicVowTools(zone);

  const nonPassable = () => 'i am a function';

  const specimenA = Promise.resolve('i am a promise');
  const specimenB = watch(nonPassable);

  const result = await when(all([specimenA, specimenB]));
  t.is(result.length, 2);
  t.is(result[0], 'i am a promise');
  t.is(result[1], nonPassable);
  t.is(result[1](), 'i am a function');
});

test('vowTools.allSettled handles mixed fulfilled and rejected vows', async t => {
  const zone = makeHeapZone();
  const { watch, when, allSettled } = prepareBasicVowTools(zone);

  const vowA = watch(Promise.resolve('a'));
  const vowB = watch(Promise.reject(new Error('b')));
  const vowC = watch(Promise.resolve('c'));

  const result = await when(allSettled([vowA, vowB, vowC]));
  t.is(result.length, 3);
  t.deepEqual(result[0], { status: 'fulfilled', value: 'a' });
  t.deepEqual(result[1], {
    status: 'rejected',
    reason: new Error('b'),
  });
  t.deepEqual(result[2], { status: 'fulfilled', value: 'c' });
});

test('vowTools.allSettled accepts any passables', async t => {
  const zone = makeHeapZone();
  const { watch, when, allSettled } = prepareBasicVowTools(zone);

  const result = await when(
    allSettled([
      watch(Promise.resolve('a')),
      watch(Promise.reject(new Error('b'))),
      Promise.resolve('c'),
      1n,
      { foo: 'e' },
      new Error('f'),
      'g',
      undefined,
    ]),
  );
  t.is(result.length, 8);
  t.deepEqual(result[0], { status: 'fulfilled', value: 'a' });
  t.deepEqual(result[1], {
    status: 'rejected',
    reason: Error('b'),
  });
  t.deepEqual(result[2], { status: 'fulfilled', value: 'c' });
  t.deepEqual(result[3], { status: 'fulfilled', value: 1n });
  t.deepEqual(result[4], { status: 'fulfilled', value: { foo: 'e' } });
  t.deepEqual(result[5], { status: 'fulfilled', value: Error('f') });
  t.deepEqual(result[6], { status: 'fulfilled', value: 'g' });
  t.deepEqual(result[7], { status: 'fulfilled', value: undefined });
});

test('vowTools.allSettled returns vows in order', async t => {
  const zone = makeHeapZone();
  const { watch, when, allSettled, makeVowKit } = prepareBasicVowTools(zone);
  const kit = makeVowKit();

  const vowA = watch(kit.vow);
  const vowB = watch(Promise.resolve('b'));
  const vowC = watch(Promise.reject(new Error('c')));
  const allSettledV = allSettled([vowA, vowB, vowC]);
  setTimeoutAmbient(() => kit.resolver.resolve('a'), 250);

  const result = await when(allSettledV);
  t.is(result.length, 3);
  t.deepEqual(result[0], { status: 'fulfilled', value: 'a' });
  t.deepEqual(result[1], { status: 'fulfilled', value: 'b' });
  t.deepEqual(result[2], {
    status: 'rejected',
    reason: new Error('c'),
  });
});

test('vowTools.allSettled handles unstorable results', async t => {
  const zone = makeHeapZone();
  const { watch, when, allSettled } = prepareBasicVowTools(zone);

  // it's not recommended to use non-passables with allVows or allSettled,
  // but an attempt will be made to store the value
  const nonPassable = () => 'im a function';
  t.is(zone.isStorable(nonPassable), false);

  const vowA = watch(Promise.resolve('a'));
  const vowB = watch(nonPassable);

  const result = await when(allSettled([vowA, vowB]));

  t.is(result.length, 2);
  t.deepEqual(result[0], { status: 'fulfilled', value: 'a' });
  t.deepEqual(result[1], { status: 'fulfilled', value: nonPassable });
  // @ts-expect-error narrowed in line above
  t.is(result[1].value(), 'im a function');
});
