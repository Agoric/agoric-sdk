import { test } from './prepare-test-env-ava.js';

/* global globalThis */
// @ts-expect-error VatData not optional
delete globalThis.VatData;

/** @see present.test.js */
test('methods available that throw', async t => {
  const { defineKind } = await import('../src/index.js');
  t.throws(() => defineKind('someTag', () => {}, {}), {
    message: /VatData unavailable/,
  });
});
