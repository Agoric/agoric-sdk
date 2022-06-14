// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test, VatData } from '@agoric/zoe/tools/prepare-test-env-ava.js';

test('harden from SES is in the zoe contract environment', t => {
  // @ts-expect-error testing existence of function only
  harden();
  t.pass();
});

test('(mock) kind makers from SwingSet are in the zoe contract environment', t => {
  VatData.defineKind('x', () => {}, {});
  VatData.defineKindMulti('x', () => {}, { x: {}, y: {} });
  const kh = VatData.makeKindHandle();
  VatData.defineDurableKind(kh, () => {}, {});
  VatData.defineDurableKindMulti(kh, () => {}, { x: {}, y: {} });
  t.pass();
});

test('(mock) store makers from SwingSet are in the zoe contract environment', t => {
  VatData.makeScalarBigMapStore();
  VatData.makeScalarBigWeakMapStore();
  VatData.makeScalarBigSetStore();
  VatData.makeScalarBigWeakSetStore();
  t.pass();
});
