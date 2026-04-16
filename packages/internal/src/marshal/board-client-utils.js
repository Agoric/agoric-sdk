// @ts-check
import { Fail } from '@endo/errors';
import { Far } from '@endo/far';
import { makeMarshal } from '@endo/marshal';
import { isStreamCell } from '../lib-chainStorage.js';
import { assertCapData } from './cap-data.js';

/**
 * @import {RemotableObject} from '@endo/pass-style';
 * @import {CapData, FromCapData, ConvertValToSlot, Marshal} from '@endo/marshal';
 */

/**
 * @template [BoardId=(string | null)]
 * @typedef {{ getBoardId: () => BoardId } & RemotableObject} BoardRemote
 */

/**
 * @template [BoardId=(string | null)]
 * @param {{ boardId: BoardId; iface?: string }} slotInfo
 * @returns {BoardRemote<BoardId>}
 */
export const makeBoardRemote = ({ boardId, iface }) => {
  const nonalleged = iface ? iface.replace(/^Alleged: /, '') : '';
  return Far(`BoardRemote${nonalleged}`, { getBoardId: () => boardId });
};

/**
 * @template [BoardId=string]
 * @param {BoardId} boardId
 * @param {string} iface
 */
export const slotToBoardRemote = (boardId, iface) =>
  makeBoardRemote({ boardId, iface });

/**
 * @param {BoardRemote<any> | object} val
 * @returns {val extends BoardRemote<infer BoardId> ? BoardId : never}
 */
const boardValToSlot = val => {
  if ('getBoardId' in val) {
    return val.getBoardId();
  }
  throw Fail`unknown obj in boardSlottingMarshaller.valToSlot ${val}`;
};

/**
 * A marshaller which can serialize getBoardId() -bearing Remotables. This
 * allows the caller to pick their slots. The deserializer is configurable: the
 * default cannot handle Remotable-bearing data.
 *
 * @template [BoardId=(string | null)]
 * @param {(slot: BoardId, iface: string) => any} [slotToVal]
 * @returns {Omit<Marshal<BoardId>, 'serialize' | 'unserialize'>}
 */
export const boardSlottingMarshaller = (slotToVal = undefined) => {
  return makeMarshal(
    /** @type {ConvertValToSlot<BoardId>} */ (boardValToSlot),
    slotToVal,
    {
      serializeBodyFormat: 'smallcaps',
    },
  );
};

/**
 * Read and unmarshal a value from a map representation of vstorage data
 *
 * @param {Map<string, string>} data
 * @param {string} key
 * @param {FromCapData<string>} fromCapData
 * @param {number} index index of the desired value in a deserialized stream
 *   cell
 * @returns {any}
 */
export const unmarshalFromVstorage = (data, key, fromCapData, index) => {
  const serialized = data.get(key) || Fail`no data for ${key}`;
  assert.typeof(serialized, 'string');
  assert.typeof(index, 'number');

  const streamCell = JSON.parse(serialized);
  if (!isStreamCell(streamCell)) {
    throw Fail`not a StreamCell: ${streamCell}`;
  }

  const { values } = streamCell;
  values.length > 0 || Fail`no StreamCell values: ${streamCell}`;

  const marshalled = values.at(index);
  assert.typeof(marshalled, 'string');

  /** @type {CapData<string>} */
  const capData = harden(JSON.parse(marshalled));
  assertCapData(capData);

  const unmarshalled = fromCapData(capData);
  return unmarshalled;
};
harden(unmarshalFromVstorage);

/**
 * Provide access to object graphs serialized in vstorage.
 *
 * @param {[string, string][]} entries
 * @param {(slot: string, iface?: string) => any} [slotToVal]
 */
export const makeHistoryReviver = (entries, slotToVal = undefined) => {
  const board = boardSlottingMarshaller(slotToVal);
  const vsMap = new Map(entries);
  /** @param {...unknown} args } */
  const fromCapData = (...args) =>
    Reflect.apply(board.fromCapData, board, args);
  /** @param {string} key } */
  const getItem = key => unmarshalFromVstorage(vsMap, key, fromCapData, -1);
  /** @param {string} prefix } */
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
  /** @param {string} k } */
  const has = k => vsMap.get(k) !== undefined;

  return harden({ getItem, children, has });
};
