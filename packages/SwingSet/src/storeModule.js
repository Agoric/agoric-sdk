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

let MyVatData;
if ('VatData' in globalThis) {
  MyVatData = VatData;
} else {
  console.log('Emulating VatData');
  MyVatData = {
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
} = MyVatData;
