/* global VatData */

const start = _zcf => {
  VatData.defineKind('x', () => {}, {});
  VatData.defineKindMulti('x', () => {}, { x: {}, y: {} });
  const kh = VatData.makeKindHandle();
  VatData.defineDurableKind(kh, () => {}, {});
  VatData.defineDurableKindMulti(kh, () => {}, { x: {}, y: {} });
  VatData.makeScalarBigMapStore();
  VatData.makeScalarBigWeakMapStore();
  VatData.makeScalarBigSetStore();
  VatData.makeScalarBigWeakSetStore();

  return harden({});
};
harden(start);
export { start };
