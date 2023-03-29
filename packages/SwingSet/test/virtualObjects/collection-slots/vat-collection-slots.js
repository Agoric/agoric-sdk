/* global VatData */
import { Far } from '@endo/far';

// import { makeScalarBigMapStore } from '@agoric/vat-data';
const { makeScalarBigMapStore } = VatData;

function makeRemotable(imp1) {
  return Far('rem1', { get: () => imp1 });
}

// vc1 -> vc2 -> rem1 -> imp1

export function buildRootObject() {
  const vc1 = makeScalarBigMapStore('vc1');

  return Far('root', {
    build(imp1) {
      const vc2 = makeScalarBigMapStore('vc2');
      const rem1 = makeRemotable(imp1);
      vc2.init('key', rem1);
      vc1.init('vc2', vc2);
    },
    delete() {
      vc1.delete('vc2');
    },
    flush() {},
  });
}
