// @ts-check
import test from 'ava';
import { E, Far } from '@endo/far';

import { V, makeVowKit } from '../vow.js';

test('heap messages', async t => {
  const greeter = Far('Greeter', {
    hello: /** @param {string} name */ name => `Hello, ${name}!`,
  });

  /** @type {ReturnType<typeof makeVowKit<typeof greeter>>} */
  const { vow, resolver } = makeVowKit();
  const retP = V(vow).hello('World');
  resolver.resolve(greeter);

  // Happy path: WE(vow)[method](...args) calls the method.
  t.is(await retP, 'Hello, World!');

  // Sad path: E(vow)[method](...args) rejects.
  await t.throwsAsync(
    // @ts-expect-error hello is not accessible via basicE
    () => E(vow).hello('World'),
    {
      message: /target has no method "hello"/,
    },
  );

  // Happy path: await WE.when unwraps the vow.
  t.is(await V.when(vow), greeter);

  t.is(
    await V.when(vow, res => {
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
