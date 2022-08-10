// @ts-check
import makeLegacyMap, { makeScalarMap } from '@agoric/store';
import { Far, makeMarshal, Remotable } from '@endo/marshal';
import { HandledPromise } from '@endo/eventual-send'; // TODO: convince tsc this isn't needed
import { makePromiseKit } from '@endo/promise-kit';

const { details: X, quote: q } = assert;

/**
 * For a value with a known id in the board, we can use
 * that board id as a slot to preserve identity when marshaling.
 *
 * @typedef {`board${Digits}`} BoardId
 */

/**
 * @param {unknown} specimen
 * @returns {specimen is BoardId}
 */
const isBoardId = specimen => {
  return typeof specimen === 'string' && !!specimen.match(/board[^:]/);
};

/**
 * When marshaling a purse, payment, etc. we partition the slots
 * using prefixes.
 *
 * @template {Record<string, IdTable<*,*>>} T
 * @typedef {`${string & keyof T}:${Digits}`} WalletSlot<T>
 */
/**
 * @template {string} K
 * @typedef {`${K}:${Digits}`} KindSlot<K>
 */

/**
 * @template {Record<string, IdTable<*,*>>} T
 * @param {T} _tables
 * @param {string & keyof T} kind
 * @param {number} id
 * @returns {WalletSlot<T>}
 */
const makeWalletSlot = (_tables, kind, id) => {
  const digits = /** @type {Digits} */ (`${id}`);
  return `${kind}:${digits}`;
};

/**
 * @template {Record<string, IdTable<*,*>>} T
 * @param {T} record
 * @param {(value: string, index: number, obj: string[]) => boolean} predicate
 * @returns {string & keyof T | undefined}
 */
const findKey = (record, predicate) => {
  const key = Object.keys(record).find(predicate);
  return key;
};

/**
 * @template {Record<string, IdTable<*,*>>} T
 * @param {T} tables
 * @param {string} slot
 * @returns {{ kind: undefined | string & keyof T, id: number }}
 */
const parseWalletSlot = (tables, slot) => {
  const kind = findKey(tables, k => slot.startsWith(`${k}:`));
  const id = kind ? Number(slot.slice(kind.length + 1)) : NaN;
  return { kind, id };
};

/**
 * Since KindSlots always include a colon and BoardIds never do,
 * we an mix them without confusion.
 *
 * @template {Record<string, IdTable<*,*>>} T
 * @typedef {WalletSlot<T> | BoardId} MixedSlot<T>
 */
/**
 * @typedef {`1` | `12` | `123`} Digits - 1 or more digits.
 * NOTE: the typescript definition here is more restrictive than
 * actual usage.
 */

/**
 * @template Slot
 * @template Val
 *
 * @typedef {{
 *   bySlot: MapStore<Slot, Val>,
 *   byVal: MapStore<Val, Slot>,
 * }} IdTable<Value>
 */

/**
 * @template Slot
 * @template Val
 * @param {IdTable<Slot, Val>} table
 * @param {Slot} slot
 * @param {Val} val
 */
const initSlotVal = (table, slot, val) => {
  table.bySlot.init(slot, val);
  table.byVal.init(val, slot);
};

/**
 * Make context for exporting wallet data where brands etc. can be recognized by boardId.
 *
 * When serializing wallet state for, there's a tension between
 *
 *  - keeping purses etc. closely held
 *  - recognizing identity of brands also referenced in the state of contracts such as the AMM
 *
 * `makeMarshal()` is parameterized by the type of slots. Here we use a disjoint union of
 *   - board ids for widely shared objects
 *   - kind:seq ids for closely held objects; for example purse:123
 */
export const makeExportContext = () => {
  const walletObjects = {
    /** @type {IdTable<number, Purse>} */
    purse: {
      bySlot: makeScalarMap('purseSlot'),
      byVal: makeScalarMap('purse'),
    },
    /** @type {IdTable<number, Payment>} */
    payment: {
      bySlot: makeScalarMap('paymentSlot'),
      byVal: makeScalarMap('payment'),
    },
    // TODO: offer, contact, dapp
    /** @type {IdTable<number, unknown>} */
    unknown: {
      bySlot: makeScalarMap('unknownSlot'),
      byVal: makeScalarMap('unknown'),
    },
  };
  /** @type {IdTable<BoardId, unknown>} */
  const boardObjects = {
    bySlot: makeScalarMap(),
    byVal: makeScalarMap(),
  };

  /**
   * Look up the slot in mappings from published data
   * else try walletObjects that we have seen.
   *
   * @throws if not found (a slotToVal function typically
   *         conjures a new identity)
   *
   * @param {MixedSlot<typeof walletObjects>} slot
   * @param {string} _iface
   */
  const slotToVal = (slot, _iface) => {
    if (isBoardId(slot) && boardObjects.bySlot.has(slot)) {
      return boardObjects.bySlot.get(slot);
    }
    const { kind, id } = parseWalletSlot(walletObjects, slot);
    assert(kind, X`bad slot kind: ${slot}`);
    const val = walletObjects[kind].bySlot.get(id); // or throw
    return val;
  };

  let unknownNonce = 0;

  /**
   * @param {unknown} val
   * @returns {MixedSlot<typeof walletObjects>}
   */
  const valToSlot = val => {
    if (boardObjects.byVal.has(val)) {
      return boardObjects.byVal.get(val);
    }
    const kind = findKey(walletObjects, k => walletObjects[k].byVal.has(val));
    if (kind) {
      // @ts-expect-error has(val) above ensures val has the right type
      const id = walletObjects[kind].byVal.get(val);
      return makeWalletSlot(walletObjects, kind, id);
    }
    unknownNonce += 1;
    const slot = makeWalletSlot(walletObjects, 'unknown', unknownNonce);
    initSlotVal(walletObjects.unknown, unknownNonce, val);
    return slot;
  };

  /**
   * @template V
   * @param {string & keyof typeof walletObjects} kind
   * @param {IdTable<number, V>} table
   */
  const makeSaver = (kind, table) => {
    let nonce = 0;
    /** @param {V} val */
    const saver = val => {
      nonce += 1;
      initSlotVal(table, nonce, val);
    };
    return saver;
  };

  return harden({
    savePurseActions: makeSaver('purse', walletObjects.purse),
    savePaymentActions: makeSaver('payment', walletObjects.payment),
    /**
     * @param {number} id
     * @param {Purse} purse
     */
    initPurseId: (id, purse) => {
      initSlotVal(walletObjects.purse, id, purse);
    },
    purseEntries: walletObjects.purse.bySlot.entries,
    /**
     * @param {BoardId} id
     * @param {unknown} val
     */
    initBoardId: (id, val) => {
      initSlotVal(boardObjects, id, val);
    },
    /**
     * @param {BoardId} id
     * @param {unknown} val
     */
    ensureBoardId: (id, val) => {
      if (boardObjects.byVal.has(val)) {
        assert.equal(boardObjects.byVal.get(val), id);
        return;
      }
      initSlotVal(boardObjects, id, val);
    },
    ...makeMarshal(valToSlot, slotToVal),
  });
};

const defaultMakePresence = iface => {
  const severed = `SEVERED: ${iface.replace(/^Alleged: /, '')}`;
  return Far(severed, {});
};

/**
 * Make context for unserializing wallet or board data.
 *
 * @param {() => Promise<void>} flush
 * @param {(iface: string) => any} [makePresence]
 */
export const makeImportContext = (
  flush,
  makePresence = defaultMakePresence,
) => {
  const walletObjects = {
    /** @type {IdTable<number, unknown>} */
    purse: {
      bySlot: makeScalarMap(),
      byVal: makeScalarMap(),
    },
    /** @type {IdTable<number, unknown>} */
    payment: {
      bySlot: makeScalarMap(),
      byVal: makeScalarMap(),
    },
    /** @type {IdTable<number, unknown>} */
    unknown: {
      bySlot: makeScalarMap(),
      byVal: makeScalarMap(),
    },
  };
  /** @type {IdTable<BoardId, unknown>} */
  const boardObjects = {
    bySlot: makeScalarMap(),
    byVal: makeScalarMap(),
  };

  /**
   * @template Slot
   * @template Val
   * @param {IdTable<Slot, Val>} table
   * @param {Slot} slot
   * @param {string} iface
   */
  const provideVal = (table, slot, iface) => {
    if (table.bySlot.has(slot)) {
      return table.bySlot.get(slot);
    }
    const val = makePresence(iface);
    initSlotVal(table, slot, val);
    return val;
  };

  const slotToVal = {
    /**
     * @param {string} slot
     * @param {string} iface
     */
    fromBoard: (slot, iface) => {
      assert(isBoardId(slot), X`bad board slot ${q(slot)}`);
      return provideVal(boardObjects, slot, iface);
    },

    /**
     * @param {string} slot
     * @param {string} iface
     */
    fromMyWallet: (slot, iface) => {
      const { kind, id } = parseWalletSlot(walletObjects, slot);
      return kind
        ? provideVal(walletObjects[kind], id, iface)
        : slotToVal.fromBoard(slot, iface);
    },
  };

  const valToSlot = {
    /** @param {unknown} val */
    fromMyWallet: val => {
      const kind = findKey(walletObjects, k => walletObjects[k].byVal.has(val));
      if (kind) {
        const id = walletObjects[kind].byVal.get(val);
        return makeWalletSlot(walletObjects, kind, id);
      }
      assert.fail(X`cannot serialize unregistered ${val}`);
    },
  };

  const marshal = {
    fromBoard: makeMarshal(undefined, slotToVal.fromBoard, {
      marshalName: 'fromBoard',
    }),
    fromMyWallet: makeMarshal(valToSlot.fromMyWallet, slotToVal.fromMyWallet, {
      marshalName: 'fromMyWallet',
    }),
  };

  let nonce = 0;

  const registerUnknown = val => {
    nonce += 1;
    initSlotVal(walletObjects.unknown, nonce, val);
    return nonce;
  };
  const wallet = makePresence('Remotable');
  registerUnknown(wallet);

  const all = async goals => {
    await flush();
    return Promise.all(goals);
  };

  return harden({
    getBootstrap: () => wallet,
    all,
    registerUnknown,
    fromMyWallet: Far('wallet marshaller', { ...marshal.fromMyWallet }),
    fromBoard: Far('board marshaller', { ...marshal.fromBoard }),
  });
};

/**
 * @param {string} iface
 * @param {{
 *   applyMethod: (target: unknown, method: string | symbol, args: unknown[]) => void,
 *   applyFunction: (target: unknown, args: unknown[]) => void,
 * }} handler
 */
const makePresence = (iface, handler) => {
  let obj;
  // eslint-disable-next-line no-new
  new HandledPromise((resolve, reject, resolveWithPresence) => {
    obj = resolveWithPresence(handler);
  });
  assert(obj);
  return Remotable(iface, undefined, obj);
};

/**
 * @param {string} iface
 * @param {(parts: unknown[], resultP: Promise<unknown>) => void} log
 */
export const makeLoggingPresence = (iface, log) => {
  /** @type {any} */ // TODO: solve types puzzle
  const it = makePresence(iface, {
    applyMethod: (target, method, args, resultP) => {
      return log(harden(['applyMethod', target, method, args]), resultP);
    },
    applyFunction: (target, args, resultP) => {
      return log(harden(['applyFunction', target, args]), resultP);
    },
  });
  return it;
};
