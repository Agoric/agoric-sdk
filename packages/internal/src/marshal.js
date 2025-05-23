// @ts-check
import { Fail } from '@endo/errors';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/far';
import { makeMarshal } from '@endo/marshal';
import { M } from '@endo/patterns';
import { isStreamCell } from './lib-chainStorage.js';

/**
 * @import {EOnly} from '@endo/eventual-send';
 * @import {RemotableObject, Simplify} from '@endo/pass-style';
 * @import {CapData, FromCapData, ConvertValToSlot, Passable, Marshal, MakeMarshalOptions} from '@endo/marshal';
 * @import {ERemote, TypedPattern} from './types.js';
 */

/**
 * @template [Slot=unknown]
 * @typedef {Simplify<EOnly<Marshal<Slot>>>} EMarshaller
 */

/**
 * @template [BoardId=(string | null)]
 * @typedef {{ getBoardId: () => BoardId } & RemotableObject} BoardRemote
 */

/**
 * @template [BoardId=(string | null)]
 * @param {{ boardId: BoardId; iface?: string; prefix?: string }} slotInfo
 * @returns {BoardRemote<BoardId>}
 */
export const makeBoardRemote = ({ boardId, iface, prefix = 'BoardRemote' }) => {
  const nonalleged = iface ? iface.replace(/^Alleged: /, '') : '';
  return Far(`${prefix}${nonalleged}`, { getBoardId: () => boardId });
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

const ifaceAllegedPrefix = 'Alleged: ';
const ifaceInaccessiblePrefix = 'SEVERED: ';
/**
 * @param {string | undefined} iface
 * @returns {any}
 */
export const makeInaccessibleVal = iface => {
  if (typeof iface === 'string' && iface.startsWith(ifaceAllegedPrefix)) {
    iface = iface.slice(ifaceAllegedPrefix.length);
  }
  return Far(`${ifaceInaccessiblePrefix}${iface}`, {});
};

// TODO move CapDataShape to Endo
/**
 * @type {TypedPattern<CapData<any>>}
 */
export const CapDataShape = { body: M.string(), slots: M.array() };
harden(CapDataShape);

/**
 * Assert that this is CapData
 *
 * @param {unknown} data
 * @returns {asserts data is CapData<unknown>}
 */
export const assertCapData = data => {
  assert.typeof(data, 'object');
  assert(data);
  typeof data.body === 'string' || Fail`data has non-string .body ${data.body}`;
  Array.isArray(data.slots) || Fail`data has non-Array slots ${data.slots}`;
};
harden(assertCapData);

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

/** @param {CapData<unknown>} cap */
const rejectOCap = cap => Fail`${cap} is not pure data`;
export const pureDataMarshaller = makeMarshal(rejectOCap, rejectOCap, {
  serializeBodyFormat: 'smallcaps',
});
harden(pureDataMarshaller);

/**
 * @template [Slot=unknown]
 * @param {ERemote<Pick<EMarshaller<Slot>, 'fromCapData' | 'toCapData'>>} marshaller
 * @param {MakeMarshalOptions} [marshalOptions]
 * @returns {ReturnType<typeof Far<EMarshaller<Slot>>>}
 */
export const wrapRemoteMarshallerSendSlotsOnly = (
  marshaller,
  {
    serializeBodyFormat = 'smallcaps',
    errorTagging = 'off', // Disable error tagging by default
    ...otherMarshalOptions
  } = {},
) => {
  const marshalOptions = harden({
    serializeBodyFormat,
    errorTagging,
    ...otherMarshalOptions,
  });

  /** @type {Marshal<object | null>} */
  const passThroughMarshaller = makeMarshal(
    undefined,
    (slot, iface) => slot ?? makeInaccessibleVal(iface),
    marshalOptions,
  );

  /** @type {Map<Slot, string | undefined>} */
  const remoteSlotToIface = new Map();

  /** @type {Pick<Marshal<Slot>, 'toCapData' | 'fromCapData'>} */
  const boardRemoteMarshaller = makeMarshal(
    /** @type {ConvertValToSlot<Slot>} */ (boardValToSlot),
    (slot, iface) => {
      // Note: Technically different slots could contain the same slotId with
      // different iface. If the marshaller producing CapData wasn't well
      // behaved, we just store the last iface encountered.
      if (slot != null) remoteSlotToIface.set(slot, iface);
      return makeBoardRemote({ boardId: slot, iface, prefix: '' });
    },
    marshalOptions,
  );

  /**
   * @param {Slot[]} slots
   * @param {(index: number) => string | undefined} getIface
   * @returns {Promise<(object | null)[]>}
   */
  const mapSlotsToCaps = async (slots, getIface) => {
    let hasCap = false;
    const boardRemoteMappedSlots = harden(
      slots.map((slot, index) => {
        if (slot == null) return null;
        hasCap = true;
        return makeBoardRemote({
          boardId: slot,
          iface: getIface(index),
          prefix: '',
        });
      }),
    );
    if (!hasCap) return boardRemoteMappedSlots;

    const slotsOnlyCapData = boardRemoteMarshaller.toCapData(
      boardRemoteMappedSlots,
    );
    return E(marshaller).fromCapData(slotsOnlyCapData);
  };

  /**
   * @param {object[]} caps
   * @returns {Promise<Slot[]>}
   */
  const mapCapsToSlots = async caps => {
    if (caps.length === 0) {
      return caps;
    }
    const mappedSlotsCapData = await E(marshaller).toCapData(caps);
    /** @type {BoardRemote<Slot>[]} */
    const boardRemoteMappedSlots =
      boardRemoteMarshaller.fromCapData(mappedSlotsCapData);

    // We don't care about the remote iface and rely on the one extracted by the local marshaller
    remoteSlotToIface.clear();
    return boardRemoteMappedSlots.map(boardRemote => boardRemote.getBoardId());
  };

  /** @param {CapData<Slot>} data */
  const makeIfaceExtractor = data => {
    /** @type {(string | undefined)[] | undefined} */
    let ifaces;

    const getIface = slotIndex => {
      if (!ifaces) {
        boardRemoteMarshaller.fromCapData(data);
        ifaces = data.slots.map(slot => remoteSlotToIface.get(slot));
        remoteSlotToIface.clear();
      }

      return ifaces[slotIndex];
    };

    return getIface;
  };

  /**
   * @param {Passable} val
   * @returns {Promise<CapData<Slot>>}
   */
  const toCapData = async val => {
    const capData = passThroughMarshaller.toCapData(val);
    const mappedSlots = await mapCapsToSlots(capData.slots);
    return harden({ ...capData, slots: mappedSlots });
  };

  /**
   * @param {CapData<Slot>} data
   * @returns {Promise<Passable>}
   */
  const fromCapData = async data => {
    const getIface = makeIfaceExtractor(data);
    const mappedSlots = await mapSlotsToCaps(data.slots, getIface);
    return passThroughMarshaller.fromCapData({ ...data, slots: mappedSlots });
  };

  return Far('wrapped remote marshaller', {
    toCapData,
    fromCapData,

    // for backwards compatibility
    /** @deprecated use toCapData */
    serialize: toCapData,
    /** @deprecated use fromCapData */
    unserialize: fromCapData,
  });
};

/**
 * @template [Slot=unknown]
 * @param {ERemote<Pick<EMarshaller<Slot>, 'fromCapData' | 'toCapData'>>} marshaller
 * @returns {ReturnType<typeof Far<EMarshaller<Slot>>>}
 */
export const wrapRemoteMarshallerDirectSend = marshaller => {
  /**
   * @param {Passable} val
   * @returns {Promise<CapData<Slot>>}
   */
  const toCapData = val => E(marshaller).toCapData(val);

  /**
   * @param {CapData<Slot>} data
   * @returns {Promise<Passable>}
   */
  const fromCapData = data => E(marshaller).fromCapData(data);

  return Far('wrapped remote marshaller', {
    toCapData,
    fromCapData,

    // for backwards compatibility
    /** @deprecated use toCapData */
    serialize: toCapData,
    /** @deprecated use fromCapData */
    unserialize: fromCapData,
  });
};

export const wrapRemoteMarshaller = wrapRemoteMarshallerSendSlotsOnly;
