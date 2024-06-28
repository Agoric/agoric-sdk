// @ts-check
import test from 'ava';
import { E, Far } from '@endo/far';

import { heapVowE, heapVowTools } from '../vat.js';
import { getVowPayload } from '../src/vow-utils.js';

const { makeVowKit, when } = heapVowTools;

test('heap messages', async t => {
  t.is(heapVowE, heapVowTools.E);

  const greeter = Far('Greeter', {
    hello: /** @param {string} name */ name => `Hello, ${name}!`,
  });

  /** @type {ReturnType<typeof makeVowKit<typeof greeter>>} */
  const { vow, resolver } = makeVowKit();
  const retP = heapVowE(vow).hello('World');
  resolver.resolve(greeter);

  // Happy path: vowE(vow)[method](...args) calls the method.
  t.is(await retP, 'Hello, World!');

  // Sad path: E(vow)[method](...args) rejects.
  await t.throwsAsync(
    // @ts-expect-error hello is not accessible via basicE
    () => E(vow).hello('World'),
    {
      message: /target has no method "hello"/,
    },
  );

  // Happy path: vowE(x, { watch: true }) doesn't unwrap the result.
  const watchTrueP = heapVowE(vow, { watch: true }).hello('Mathieu');
  t.is(watchTrueP, Promise.resolve(watchTrueP));
  const watchTrue = await watchTrueP;
  t.truthy(getVowPayload(watchTrue));
  t.is(await when(watchTrue), 'Hello, Mathieu!');

  // Happy path: vowE(x, { watch: watcher }) returns the watched vow.
  /** @type {import('../src/types.js').Watcher<any, any, void>} */
  const watcher = {
    onFulfilled(r) {
      t.is(r, 'Hello, Mark!');
      return Promise.resolve('done');
    },
    onRejected(_r) {
      t.fail('unexpected rejection');
    },
  };
  const nextWatcherP = heapVowE(vow, { watch: watcher }).hello('Mark');
  t.is(nextWatcherP, Promise.resolve(nextWatcherP));
  const nextWatcher = await nextWatcherP;
  t.truthy(getVowPayload(nextWatcher));
  t.is(await when(nextWatcherP), 'done');

  // Happy path: await vowE.when unwraps the vow.
  t.is(await heapVowE.when(vow), greeter);

  t.is(
    await heapVowE.when(vow, res => {
      t.is(res, greeter);
      return 'done';
    }),
    'done',
  );

  // Sad path: await by itself gives the raw vow.
  const w = await vow;
  t.not(w, greeter);
  t.truthy(w.payload);
});
