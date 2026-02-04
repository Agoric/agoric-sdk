// @ts-check
/**
 * Board utilities for client-utils.
 * These are copied from @agoric/vats/tools/board-utils.js to avoid a runtime
 * dependency on @agoric/vats.
 */

/**
 * @import {ContractMeta, Installation, Instance, Invitation, ZCF} from '@agoric/zoe';
 * @import {DisplayInfo, Issuer, Brand} from '@agoric/ertp';
 * @import {BoardRemote} from '@agoric/internal/src/marshal/board-client-utils.js';
 * @import {RemotableObject} from '@endo/pass-style';
 * @import {ERef} from '@agoric/vow';
 */

/**
 * @typedef {{
 *   brand: BoardRemote;
 *   denom: string;
 *   displayInfo: DisplayInfo;
 *   issuer: BoardRemote;
 *   issuerName: string;
 *   proposedName: string;
 * }} VBankAssetDetail
 */

/**
 * @typedef {{
 *   brand: Record<string, BoardRemote>;
 *   instance: Record<string, Instance>;
 *   installation: Record<string, Installation>;
 *   issuer: Record<string, Issuer>;
 *   vbankAsset: Record<string, VBankAssetDetail>;
 *   reverse: Record<string, string>;
 * }} AgoricNamesRemotes
 */

/**
 * @typedef {object} AssetDescriptor
 * @property {Brand} brand
 * @property {RemotableObject & ERef<Issuer>} issuer
 * @property {string} issuerName
 * @property {string} denom
 * @property {string} proposedName
 */

/**
 * @typedef {AssetDescriptor & {
 *   issuer: Issuer<'nat'>; // settled identity
 *   displayInfo: DisplayInfo;
 * }} AssetInfo
 */

// Re-export all board utilities from @agoric/internal
export * from '@agoric/internal/src/marshal/board-client-utils.js';
