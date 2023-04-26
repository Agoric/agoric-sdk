import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
/* global globalThis */
delete globalThis.VatData;

/** @see present.test.js */
test('methods available that throw', async t => {
  const { defineKind } = await import('../src/index.js');
  t.throws(defineKind, { message: /VatData unavailable/ });
});
