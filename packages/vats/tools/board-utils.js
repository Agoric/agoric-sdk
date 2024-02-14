/**
 * @typedef {{
 *   brand: import('@agoric/internal/src/marshal.js').BoardRemote;
 *   denom: string;
 *   displayInfo: DisplayInfo;
 *   issuer: import('@agoric/internal/src/marshal.js').BoardRemote;
 *   issuerName: string;
 *   proposedName: string;
 * }} VBankAssetDetail
 */
/**
 * @typedef {{
 *   brand: Record<
 *     string,
 *     import('@agoric/internal/src/marshal.js').BoardRemote
 *   >;
 *   instance: Record<string, Instance>;
 *   vbankAsset: Record<string, VBankAssetDetail>;
 *   reverse: Record<string, string>;
 * }} AgoricNamesRemotes
 */

import {
  slotToBoardRemote,
  unmarshalFromVstorage,
} from '@agoric/internal/src/marshal.js';
import { makeScalarBigMapStore } from '@agoric/vat-data';
import { makeMarshal } from '@endo/marshal';
import { prepareBoardKit } from '../src/lib-board.js';

export * from '@agoric/internal/src/marshal.js';

/**
 * @param {import('@agoric/internal/src/storage-test-utils.js').FakeStorageKit} fakeStorageKit
 * @returns {AgoricNamesRemotes}
 */
export const makeAgoricNamesRemotesFromFakeStorage = fakeStorageKit => {
  const { data } = fakeStorageKit;

  // this produces Remotables that can roundtrip through a
  // boardValToSlot-using marshaller

  const { fromCapData } = makeMarshal(undefined, slotToBoardRemote);
  const reverse = {};
  const entries = ['brand', 'instance'].map(kind => {
    /**
     * @type {[
     *   string,
     *   import('@agoric/vats/tools/board-utils.js').BoardRemote,
     * ][]}
     */
    const parts = unmarshalFromVstorage(
      data,
      `published.agoricNames.${kind}`,
      fromCapData,
      -1,
    );
    for (const [name, remote] of parts) {
      reverse[remote.getBoardId()] = name;
    }
    return [kind, Object.fromEntries(parts)];
  });
  const tables = Object.fromEntries(entries);
  // XXX not part of reverse[]
  const vbankAsset = Object.fromEntries(
    unmarshalFromVstorage(
      data,
      `published.agoricNames.vbankAsset`,
      fromCapData,
      -1,
    ).map(([_denom, info]) => [
      info.issuerName,
      { ...info, brand: tables.brand[info.issuerName] },
    ]),
  );
  return { ...tables, reverse, vbankAsset };
};
harden(makeAgoricNamesRemotesFromFakeStorage);

/**
 * Make a board that uses durable storage, but with fake baggage which will fail
 * upgrade. Suitable only for use in tests.
 *
 * @param {bigint | number} [initSequence]
 * @param {object} [options]
 * @param {string} [options.prefix]
 * @param {number} [options.crcDigits]
 */
export const makeFakeBoard = (initSequence = 0, options = {}) => {
  const make = prepareBoardKit(makeScalarBigMapStore('baggage'));
  return make(initSequence, options).board;
};
