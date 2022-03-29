import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

test('methods available', async t => {
  const { defineKind } = await import('../src/index.js');
  defineKind(
    'test',
    () => {},
    () => {},
  );
  t.pass();
});
