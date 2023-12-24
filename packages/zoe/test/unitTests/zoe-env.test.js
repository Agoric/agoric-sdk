import {
  test,
  VatData,
} from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

test('harden from SES is in the zoe contract environment', t => {
  // @ts-expect-error testing existence of function only
  harden();
  t.pass();
});

test('(mock) kind makers from SwingSet are in the zoe contract environment', t => {
  VatData.defineKind('x', () => {}, {});
  VatData.defineKindMulti('x', () => {}, { x: {}, y: {} });
  const kh = VatData.makeKindHandle('tag');
  VatData.defineDurableKind(kh, () => {}, {});
  const kh2 = VatData.makeKindHandle('tag');
  VatData.defineDurableKindMulti(kh2, () => {}, { x: {}, y: {} });
  t.pass();
});

test('(mock) store makers from SwingSet are in the zoe contract environment', t => {
  VatData.makeScalarBigMapStore();
  VatData.makeScalarBigWeakMapStore();
  VatData.makeScalarBigSetStore();
  VatData.makeScalarBigWeakSetStore();
  t.pass();
});
