/* global VatData */

const start = _zcf => {
  VatData.makeKind();
  VatData.makeDurableKind();
  VatData.makeScalarBigMapStore();
  VatData.makeScalarBigWeakMapStore();
  VatData.makeScalarBigSetStore();
  VatData.makeScalarBigWeakSetStore();

  return harden({});
};
harden(start);
export { start };
