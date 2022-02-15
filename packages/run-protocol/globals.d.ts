// Why is there one of these in run-protocol?
// Note that vscode does its red underline thing on "function" below.

interface VatData {
  makeKind: function;
  makeDurableKind: function;
  makeScalarBigMapStore: function;
  makeScalarBigWeakMapStore: function;
  makeScalarBigSetStore: function;
  makeScalarBigWeakSetStore: function;
}

declare let VatData: VatData;
