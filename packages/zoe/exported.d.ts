/* eslint-disable -- doesn't understand .d.ts */

/// <reference types="@agoric/ertp/exported" />
/// <reference types="@endo/pass-style" />

import './src/contractSupport/types-ambient.js';

import {
  AdminFacet as _AdminFacet,
  AmountKeywordRecord as _AmountKeywordRecord,
  ContractMeta as _ContractMeta,
  Handle as _Handle,
  Invitation as _Invitation,
  InvitationAmount as _InvitationAmount,
  IssuerKeywordRecord as _IssuerKeywordRecord,
  FeeIssuerConfig as _FeeIssuerConfig,
  Keyword as _Keyword,
  OfferHandler as _OfferHandler,
  ProposalRecord as _ProposalRecord,
  TransferPart as _TransferPart,
  ZCF as _ZCF,
  ZCFMint as _ZCFMint,
  ZCFSeat as _ZCFSeat,
  ZoeService as _ZoeService,
} from './src/types-index.js';

import {
  Installation as _Installation,
  Instance as _Instance,
} from './src/zoeService/utils.js';

declare global {
  // @ts-ignore TS2666: Exports and export assignments are not permitted in module augmentations.
  export {
    _AdminFacet as __AdminFacet,
    _AmountKeywordRecord as AmountKeywordRecord,
    _ContractMeta as ContractMeta,
    _FeeIssuerConfig as FeeIssuerConfig,
    _Handle as Handle,
    _Installation as Installation,
    // _Instance as Instance,
    _Invitation as Invitation,
    _InvitationAmount as InvitationAmount,
    _IssuerKeywordRecord as IssuerKeywordRecord,
    _Keyword as Keyword,
    _OfferHandler as OfferHandler,
    _ProposalRecord as ProposalRecord,
    _TransferPart as TransferPart,
    _ZCF as ZCF,
    _ZCFMint as ZCFMint,
    _ZCFSeat as ZCFSeat,
    _ZoeService as ZoeService,
  };
}
