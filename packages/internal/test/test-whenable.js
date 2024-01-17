// @ts-check
import test from 'ava';
import { E as basicE, Far } from '@endo/far';

import { E, makeWhenableKit } from '../whenable.js';

test('heap messages', async t => {
  const greeter = Far('Greeter', {
    hello: /** @param {string} name */ name => `Hello, ${name}!`,
  });

  /** @type {import('@agoric/whenable').WhenableKit<typeof greeter>} */
  const { whenable, settler } = makeWhenableKit();
  const retP = E(whenable).hello('World');
  settler.resolve(greeter);

  // Happy path: E(whenable)[method](...args) calls the method.
  t.is(await retP, 'Hello, World!');

  // Sad path: basicE(whenable)[method](...args) rejects.
  await t.throwsAsync(
    // @ts-expect-error hello is not accessible via basicE
    () => basicE(whenable).hello('World'),
    {
      message: /target has no method "hello"/,
    },
  );

  // Happy path: await E.when unwraps the whenable.
  t.is(await E.when(whenable), greeter);

  // Sad path: await by itself gives the raw whenable.
  const w = await whenable;
  t.not(w, greeter);
  t.truthy(w.payload);
});
