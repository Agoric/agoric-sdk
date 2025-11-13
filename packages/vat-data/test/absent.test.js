import test from 'ava';

/* global globalThis */
// @ts-expect-error VatData not optional
delete globalThis.VatData;

/** @see present.test.js */
test('methods available that throw', async t => {
  const avoidBundling = '../src/index.js';
  const { defineKind } = await import(avoidBundling);
  t.throws(() => defineKind('someTag', () => {}, {}), {
    message: /VatData unavailable/,
  });
});
