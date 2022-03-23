/* global VatData globalThis */

import { Far } from '@endo/marshal';

import {
  M,
  makeScalarMapStore,
  makeScalarWeakMapStore,
  makeScalarSetStore,
  makeScalarWeakSetStore,
} from '@agoric/store';

export {
  M,
  makeScalarMapStore,
  makeScalarWeakMapStore,
  makeScalarSetStore,
  makeScalarWeakSetStore,
};

let VatDataGlobal;
if ('VatData' in globalThis) {
  VatDataGlobal = VatData;
} else {
  console.log('Emulating VatData');
  VatDataGlobal = {
    defineKind: () => assert.fail('fake defineKind not yet implemented'),
    defineDurableKind: () =>
      assert.fail('fake defineDurableKind not yet implemented'),
    makeKindHandle: tag => Far(`fake kind handle ${tag}`, {}),
    makeScalarBigMapStore: makeScalarMapStore,
    makeScalarBigWeakMapStore: makeScalarWeakMapStore,
    makeScalarBigSetStore: makeScalarSetStore,
    makeScalarBigWeakSetStore: makeScalarWeakSetStore,
  };
}

export const {
  defineKind,
  defineDurableKind,
  makeKindHandle,
  makeScalarBigMapStore,
  makeScalarBigWeakMapStore,
  makeScalarBigSetStore,
  makeScalarBigWeakSetStore,
} = VatDataGlobal;
