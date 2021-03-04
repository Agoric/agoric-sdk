// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/swingset-vat/tools/prepare-test-env';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';

test('harden from SES is in the vat environment', t => {
  harden();
  t.pass();
});

test('makeKind is in the vat environment', t => {
  // TODO: configure eslint to know that makeKind is a global
  // eslint-disable-next-line no-undef
  makeKind();
  t.pass();
});

test('makeWeakStore is in the vat environment', t => {
  // TODO: configure eslint to know that makeWeakStore is a global
  // eslint-disable-next-line no-undef
  makeWeakStore();
  t.pass();
});
