import test from 'ava';

const mockDefineKind = /** @type {any} */ (harden({}));

/* global globalThis */
// @ts-expect-error missing fields
globalThis.VatData ||= { defineKind: mockDefineKind };

test('methods available', async t => {
  const { defineKind } = await import('../src/index.js');
  t.is(defineKind, mockDefineKind);
});
