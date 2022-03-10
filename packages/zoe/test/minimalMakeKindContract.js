/* global VatData */

const start = _zcf => {
  VatData.defineKind();
  VatData.defineDurableKind();
  VatData.makeScalarBigMapStore();
  VatData.makeScalarBigWeakMapStore();
  VatData.makeScalarBigSetStore();
  VatData.makeScalarBigWeakSetStore();

  return harden({});
};
harden(start);
export { start };
