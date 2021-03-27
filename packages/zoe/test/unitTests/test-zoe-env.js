// @ts-check
/* global makeKind, makeWeakStore */
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

test('harden from SES is in the zoe contract environment', t => {
  // @ts-ignore testing existence of function only
  harden();
  t.pass();
});

test('(mock) makeKind from SwingSet is in the zoe contract environment', t => {
  // @ts-ignore testing existence of function only
  makeKind();
  t.pass();
});

test('(mock) makeWeakStore from SwingSet is in the zoe contract environment', t => {
  // @ts-ignore testing existence of function only
  makeWeakStore();
  t.pass();
});
