import test from 'ava';

const mockDefineKind = /** @type {any} */ (harden({}));

/* global globalThis */
// @ts-expect-error missing fields
globalThis.VatData ||= { defineKind: mockDefineKind };

test('methods available', async t => {
  const avoidBundling = '../src/index.js';
  const { defineKind } = await import(avoidBundling);
  t.is(defineKind, mockDefineKind);
});
