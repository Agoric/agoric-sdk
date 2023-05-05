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
    const key = `published.agoricNames.${kind}`;

    const streamCellText = data.get(key);
    streamCellText || Fail`no data for ${key}`;
    const streamCell = JSON.parse(streamCellText);
    isStreamCell(streamCell) || Fail`not a stream cell: ${streamCell}`;
    const { values } = streamCell;
    values.length > 0 || Fail`no values for ${key}`;
    /** @type {import("@endo/marshal").CapData<string>} */
    const latestCapData = JSON.parse(values.at(-1));
    /** @type {Array<[string, import('@agoric/vats/tools/board-utils.js').BoardRemote]>} */
    const parts = fromCapData(latestCapData);
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
 * @param {string} cellText
 * @returns {unknown[]}
 */
export const parsedValuesFromStreamCellText = cellText => {
  assert.typeof(cellText, 'string');
  const cell = /** @type {{blockHeight: string, values: string[]}} */ (
    JSON.parse(cellText)
  );
  isStreamCell(cell) || Fail`not a StreamCell: ${cell}`;
  const parsedValues = cell.values.map(value => JSON.parse(value));
  return harden(parsedValues);
};
harden(parsedValuesFromStreamCellText);

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
 * Decode vstorage value to CapData
 *
 * @param {string} cellText
 * @returns {import('@endo/marshal').CapData<string>}
 */
export const deserializeVstorageValue = cellText => {
  const values = parsedValuesFromStreamCellText(cellText);

  assert.equal(values.length, 1);
  const [data] = values;
  assertCapData(data);
  return data;
};
harden(deserializeVstorageValue);

/**
 * Provide access to object graphs serialized in vstorage.
 *
 * @param {Array<[string, string]>} entries
 * @param {(slot: string, iface?: string) => any} [slotToVal]
 */
export const makeHistoryReviver = (entries, slotToVal = undefined) => {
  const board = boardSlottingMarshaller(slotToVal);
  const vsMap = new Map(entries);

  const getItem = key => {
    const raw = vsMap.get(key) || Fail`no ${key}`;
    const capData = deserializeVstorageValue(raw);
    return harden(board.fromCapData(capData));
  };
  const children = prefix => {
    prefix.endsWith('.') || Fail`prefix must end with '.'`;
    return [
      ...new Set(
        entries
          .map(([k, _]) => k)
          .filter(k => k.startsWith(prefix))
          .map(k => k.slice(prefix.length).split('.')[0]),
      ),
    ];
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
