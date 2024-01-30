// @ts-check
import test from 'ava';
import { Far } from '@endo/far';

import { E, makeWhenableKit } from '../whenable.js';

test('heap messages', async t => {
  /** @type {import('../src/types.js').WhenableKit<{ hello(name:string): string}>} */
  const { whenable, settler } = makeWhenableKit();
  const retP = E(whenable).hello('World');
  settler.resolve(Far('Greeter', { hello: name => `Hello, ${name}!` }));
  t.is(await retP, 'Hello, World!');
});
