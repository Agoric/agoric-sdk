import '@agoric/install-ses';
import test from 'ava';

import { extract } from '../src/core/boot.js';

test('extract picks from specimen based on template', t => {
  const specimen = { a: 1, b: { c: 2 } };
  const template = { b: { c: true } };
  const actual = extract(template, specimen);
  t.throws(() => actual.nonexistent, {
    message: '(a string) not permitted, only (an object)',
  });
  t.is(actual.b.c, 2);
  t.throws(() => actual.b.other, {
    message: '(a string) not permitted, only (an object)',
  });
});
