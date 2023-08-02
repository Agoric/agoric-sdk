import '@endo/init/debug.js';
import test from 'ava';

const mockDefineKind = /** @type {any} */ (harden({}));

/* global globalThis */
globalThis.VatData ||= { defineKind: mockDefineKind };

test('methods available', async t => {
  const { defineKind } = await import('../src/index.js');
  t.is(defineKind, mockDefineKind);
});
