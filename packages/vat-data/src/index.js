/* global globalThis */
import { assert } from '@agoric/assert';
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

/** @type {import('./types').VatData} */
let VatDataGlobal;
if ('VatData' in globalThis) {
  assert(globalThis.VatData, 'VatData defined in global as null or undefined');
  VatDataGlobal = globalThis.VatData;
} else {
  // XXX this module has been known to get imported (transitively) in cases that
  // never use it so we make a version that will satisfy module resolution but
  // fail at runtime.
  const unvailable = () => assert.fail('VatData unavailable');
  VatDataGlobal = {
    defineKind: unvailable,
    defineDurableKind: unvailable,
    makeKindHandle: unvailable,
    makeScalarBigMapStore: unvailable,
    makeScalarBigWeakMapStore: unvailable,
    makeScalarBigSetStore: unvailable,
    makeScalarBigWeakSetStore: unvailable,
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
