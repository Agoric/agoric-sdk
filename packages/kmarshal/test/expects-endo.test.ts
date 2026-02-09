import test from 'ava';

test('expect endo to be available', t => {
  t.truthy(globalThis.harden);
});
