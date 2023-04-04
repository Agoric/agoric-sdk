/* global VatData */
import { Far } from '@endo/far';

// import { defineKind, makeScalarBigMapStore } from '@agoric/vat-data';
const { defineKind, makeScalarBigMapStore } = VatData;

function initialize(value) {
  return harden({ value });
}

const makeVir = defineKind('virtual', initialize, {});
const makeDummy = defineKind('dummy', initialize, {});

function makeRemotable(imp1) {
  return Far('rem1', { get: () => imp1 });
}

// vc1 -> vo1 -> [rem1, imp1]

export function buildRootObject() {
  const vc1 = makeScalarBigMapStore('vc1');

  return Far('root', {
    build(imp1) {
      const rem1 = makeRemotable(imp1);
      const vo1 = makeVir(harden([rem1, imp1]));
      vc1.init('vo1', vo1);
      // kick vo1 out of the virtual-object cache's leftover slot
      makeDummy();
      makeDummy();
      makeDummy();
      makeDummy();
    },
    delete() {
      vc1.delete('vo1');
    },
  });
}
