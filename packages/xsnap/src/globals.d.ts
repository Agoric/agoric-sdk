declare var issueCommand: (msg: ArrayBuffer) => ArrayBuffer;

namespace global {
  declare var issueCommand: (msg: ArrayBuffer) => ArrayBuffer;
}

interface VatData {
  makeKind: function;
  makeDurableKind: function;
  makeScalarBigMapStore: function;
  makeScalarBigWeakMapStore: function;
  makeScalarBigSetStore: function;
  makeScalarBigWeakSetStore: function;
}

declare let VatData: VatData;
