// @ts-check
import test from 'ava';
import { E, Far } from '@endo/far';

import { V, makeWhenableKit } from '../whenable.js';

test('heap messages', async t => {
  const greeter = Far('Greeter', {
    hello: /** @param {string} name */ name => `Hello, ${name}!`,
  });

  /** @type {ReturnType<typeof makeWhenableKit<typeof greeter>>} */
  const { whenable, settler } = makeWhenableKit();
  const retP = V(whenable).hello('World');
  settler.resolve(greeter);

  // Happy path: WE(whenable)[method](...args) calls the method.
  t.is(await retP, 'Hello, World!');

  // Sad path: E(whenable)[method](...args) rejects.
  await t.throwsAsync(
    // @ts-expect-error hello is not accessible via basicE
    () => E(whenable).hello('World'),
    {
      message: /target has no method "hello"/,
    },
  );

  // Happy path: await WE.when unwraps the whenable.
  t.is(await V.when(whenable), greeter);

  // Sad path: await by itself gives the raw whenable.
  const w = await whenable;
  t.not(w, greeter);
  t.truthy(w.payload);
});
