// @ts-check
/**
 * Should be a union with Remotable, but that's `any`, making this type meaningless
 *
 * @typedef {{ getBoardId: () => string }} BoardRemote
 */
/**
 * @typedef {{
 *   brand: BoardRemote & Brand,
 *   denom: string,
 *   displayInfo: DisplayInfo,
 *   issuer: BoardRemote & Issuer,
 *   issuerName: string,
 *   proposedName: string,
 * }} VBankAssetDetail
 */
/**
 * @typedef {{
 *   brand: Record<string, Brand>,
 *   instance: Record<string, Instance>,
 *   vbankAsset: Record<string, VBankAssetDetail>,
 *   reverse: Record<string, string>,
 * }} AgoricNamesRemotes
 */

import { Fail } from '@agoric/assert';
import { makeScalarBigMapStore } from '@agoric/vat-data';
import { isStreamCell } from '@agoric/internal/src/lib-chainStorage.js';
import { Far } from '@endo/far';
import { makeMarshal } from '@endo/marshal';
import { prepareBoardKit } from '../src/lib-board.js';

/**
 * @param {*} slotInfo
 * @returns {BoardRemote}
 */
export const makeBoardRemote = ({ boardId, iface }) => {
  const nonalleged =
    iface && iface.length ? iface.slice('Alleged: '.length) : '';
  return Far(`BoardRemote${nonalleged}`, { getBoardId: () => boardId });
};

export const slotToBoardRemote = (boardId, iface) =>
  makeBoardRemote({ boardId, iface });

export const boardValToSlot = val => {
  if ('getBoardId' in val) {
    return val.getBoardId();
  }
  Fail`unknown obj in boardSlottingMarshaller.valToSlot ${val}`;
};

// TODO: Consolidate with `insistCapData` functions from swingset-liveslots,
// swingset-xsnap-supervisor, etc.
/**
 * @param {unknown} data
 * @returns {asserts data is import('@endo/marshal').CapData<string>}
 */
export const assertCapData = data => {
  assert.typeof(data, 'object');
  assert(data);
  assert.typeof(data.body, 'string');
  assert(Array.isArray(data.slots));
  // XXX check that the .slots array elements are actually strings
};
harden(assertCapData);

/**
 * Read and unmarshal a value from a map representation of vstorage data
 *
 * @param {Map<string, string>} data
 * @param {string} key
 * @param {ReturnType<typeof import('@endo/marshal').makeMarshal>['fromCapData']} fromCapData
 * @param {number} [index=-1] index of the desired value in a deserialized stream cell
 */
export const unmarshalFromVstorage = (data, key, fromCapData, index = -1) => {
  const serialized = data.get(key) || Fail`no data for ${key}`;
  assert.typeof(serialized, 'string');

  const streamCell = JSON.parse(serialized);
  if (!isStreamCell(streamCell)) {
    throw Fail`not a StreamCell: ${streamCell}`;
  }

  const { values } = streamCell;
  values.length > 0 || Fail`no StreamCell values: ${streamCell}`;

  const marshalled = values.at(index);
  assert.typeof(marshalled, 'string');

  /** @type {import("@endo/marshal").CapData<string>} */
  const capData = harden(JSON.parse(marshalled));
  assertCapData(capData);

  const unmarshalled = fromCapData(capData);
  return unmarshalled;
};
harden(unmarshalFromVstorage);

/**
 * @param {import("@agoric/internal/src/storage-test-utils.js").FakeStorageKit} fakeStorageKit
 * @returns {AgoricNamesRemotes}
 */
export const makeAgoricNamesRemotesFromFakeStorage = fakeStorageKit => {
  const { data } = fakeStorageKit;

  // this produces Remotables that can roundtrip through a
  // boardValToSlot-using marshaller

  const { fromCapData } = makeMarshal(undefined, slotToBoardRemote);
  const reverse = {};
  // TODO support vbankAsset which must recur
  const entries = ['brand', 'instance'].map(kind => {
    /** @type {Array<[string, import('@agoric/vats/tools/board-utils.js').BoardRemote]>} */
    const parts = unmarshalFromVstorage(
      data,
      `published.agoricNames.${kind}`,
      fromCapData,
    );
    for (const [name, remote] of parts) {
      reverse[remote.getBoardId()] = name;
    }
    return [kind, Object.fromEntries(parts)];
  });
  return { ...Object.fromEntries(entries), reverse };
};
harden(makeAgoricNamesRemotesFromFakeStorage);

/**
 * A marshaller which can serialize getBoardId() -bearing
 * Remotables. This allows the caller to pick their slots. The
 * deserializer is configurable: the default cannot handle
 * Remotable-bearing data.
 *
 * @param {(slot: string, iface: string) => any} [slotToVal]
 * @returns {Omit<import('@endo/marshal').Marshal<string>, 'serialize' | 'unserialize'>}
 */
export const boardSlottingMarshaller = (slotToVal = undefined) => {
  return makeMarshal(boardValToSlot, slotToVal, {
    serializeBodyFormat: 'smallcaps',
  });
};

/**
 * Provide access to object graphs serialized in vstorage.
 *
 * @param {Array<[string, string]>} entries
 * @param {(slot: string, iface?: string) => any} [slotToVal]
 */
export const makeHistoryReviver = (entries, slotToVal = undefined) => {
  const board = boardSlottingMarshaller(slotToVal);
  const vsMap = new Map(entries);
  const getItem = key => unmarshalFromVstorage(vsMap, key, board.fromCapData);
  const children = prefix => {
    prefix.endsWith('.') || Fail`prefix must end with '.'`;
    return harden([
      ...new Set(
        entries
          .map(([k, _]) => k)
          .filter(k => k.startsWith(prefix))
          .map(k => k.slice(prefix.length).split('.')[0]),
      ),
    ]);
  };
  return harden({ getItem, children, has: k => vsMap.has(k) });
};

/**
 * Make a board that uses durable storage, but with fake baggage which will fail upgrade.
 * Suitable only for use in tests.
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
