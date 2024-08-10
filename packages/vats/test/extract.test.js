import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { extract } from '../src/core/utils.js';

test('extract picks from specimen based on template', t => {
  const specimen = { a: 1, b: { c: 2 } };
  const template = { b: { c: true } };
  const actual = extract(template, specimen);
  t.throws(() => actual.nonexistent, {
    message: '"nonexistent" not permitted, only ["b"]',
  });
  t.is(actual.b.c, 2);
  t.throws(() => actual.b.other, {
    message: '"other" not permitted, only ["c"]',
  });
});
