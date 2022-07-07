// @ts-check
/* eslint-disable no-use-before-define */
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { Far } from '@endo/marshal';
import { setTimeout } from 'timers';

import { makeScalarMapStore } from '../src/stores/scalarMapStore.js';
import { makeAtomicProvider } from '../src/stores/store-utils.js';

import '../src/types.js';

test('race', async t => {
  const store = makeScalarMapStore('foo');
  const provider = makeAtomicProvider(store);
  let i = 0;
  const makeValue = k =>
    // in Node 15+ use timers/promise
    new Promise(resolve => setTimeout(() => resolve(`${k} ${(i += 1)}`), 10));

  t.is(await provider.provideAsync('a', makeValue), 'a 1');
  t.is(await provider.provideAsync('a', makeValue), 'a 1');

  provider.provideAsync('b', makeValue);
  provider.provideAsync('b', makeValue);
  t.is(await provider.provideAsync('b', makeValue), 'b 2');
  t.is(await provider.provideAsync('b', makeValue), 'b 2');
});

test('reject', async t => {
  const store = makeScalarMapStore('foo');
  const provider = makeAtomicProvider(store);
  let i = 0;
  const makeValue = k => Promise.reject(Error(`failure ${k} ${(i += 1)}`));

  await t.throwsAsync(provider.provideAsync('a', makeValue), {
    message: 'failure a 1',
  });
  await t.throwsAsync(provider.provideAsync('a', makeValue), {
    // makeValue runs again (i += 1)
    message: 'failure a 2',
  });

  await t.throwsAsync(provider.provideAsync('b', makeValue), {
    message: 'failure b 3',
  });

  await t.throwsAsync(provider.provideAsync('b', makeValue), {
    message: 'failure b 4',
  });
});

test('far keys', async t => {
  const store = makeScalarMapStore('foo');
  const provider = makeAtomicProvider(store);

  let i = 0;
  const makeBrand = name =>
    Far(`brand ${name}`, {
      getAllegedName: () => `${name} ${(i += 1)}`,
    });

  const makeValue = brand => Promise.resolve(brand.getAllegedName());

  const moola = makeBrand('moola');
  const moolb = makeBrand('moolb');
  t.is(await provider.provideAsync(moola, makeValue), 'moola 1');
  t.is(await provider.provideAsync(moola, makeValue), 'moola 1');

  provider.provideAsync(moolb, makeValue);
  provider.provideAsync(moolb, makeValue);
  t.is(await provider.provideAsync(moolb, makeValue), 'moolb 2');
  t.is(await provider.provideAsync(moolb, makeValue), 'moolb 2');
});
