// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/zoe/tools/prepare-test-env';
/* global makeKind, makeWeakStore */
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';

test('harden from SES is in the zoe contract environment', t => {
  // @ts-ignore
  harden();
  t.pass();
});

test('(mock) makeKind from SwingSet is in the zoe contract environment', t => {
  // @ts-ignore
  makeKind();
  t.pass();
});

test('(mock) makeWeakStore from SwingSet is in the zoe contract environment', t => {
  // @ts-ignore
  makeWeakStore();
  t.pass();
});
