interface VatData {
  defineKind: function;
  defineDurableKind: function;
  makeScalarBigMapStore: function;
  makeScalarBigWeakMapStore: function;
  makeScalarBigSetStore: function;
  makeScalarBigWeakSetStore: function;
}

declare let VatData: VatData;
