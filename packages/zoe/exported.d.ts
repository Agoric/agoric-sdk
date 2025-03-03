/* eslint-disable -- doesn't understand .d.ts */

/// <reference types="@agoric/ertp/exported" />
/// <reference types="@endo/pass-style" />

import './src/zoeService/types-ambient.js';
import './src/contractSupport/types-ambient.js';
import './src/contracts/exported.js';
import './src/types-ambient.js';

import {
  AdminFacet as _AdminFacet,
  InvitationAmount as _InvitationAmount,
  ZCFMint as _ZCFMint,
} from './src/types-index.js';

declare global {
  // @ts-ignore TS2666: Exports and export assignments are not permitted in module augmentations.
  export {
    _AdminFacet as __AdminFacet,
    _InvitationAmount as InvitationAmount,
    _ZCFMint as ZCFMint,
  };
}
