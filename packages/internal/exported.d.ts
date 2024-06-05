/** @file Ambient exports until https://github.com/Agoric/agoric-sdk/issues/6512 */
/** @see {@link /docs/typescript.md} */
/* eslint-disable -- doesn't understand .d.ts */
import { ERef as _ERef } from '@endo/far';
import { Passable as _Passable } from '@endo/pass-style';
import {
  PromiseKit as _PromiseKit,
  PromiseRecord as _PromiseRecord,
} from '@endo/promise-kit';
import {
  Marshaller as _Marshaller,
  StorageNode as _StorageNode,
  Unserializer as _Unserializer,
  VStorageKey as _VStorageKey,
} from './src/lib-chainStorage.js';

declare global {
  // @ts-ignore TS2666: Exports and export assignments are not permitted in module augmentations.
  export {
    _ERef as ERef,
    _Marshaller as Marshaller,
    _PromiseKit as PromiseKit,
    _PromiseRecord as PromiseRecord,
    _StorageNode as StorageNode,
    _Unserializer as Unserializer,
    _VStorageKey as VStorageKey,
  };
}
