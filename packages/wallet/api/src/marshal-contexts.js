// @ts-check
import { makeScalarMap } from '@agoric/store';
import { Far, makeMarshal, Remotable } from '@endo/marshal';
import { HandledPromise } from '@endo/eventual-send'; // TODO: convince tsc this isn't needed

const { details: X, quote: q } = assert;

/**
 * Make context for exporting wallet data where brands etc. can be recognized by boardId.
 *
 * Objects should be registered before serialization:
 *   - for closely-held object, use initPurseId etc.
 *   - for published objects such as brands and issuers, use initBoardId / ensureBoardId
 *
 * Unregistered objects (such as instances in amounts) get serialized
 * with a fresh slot.
 */
export const makeExportContext = () => {
  const myData = {
    purse: {
      /** @type {MapStore<string, Purse>} */
      bySlot: makeScalarMap(),
      /** @type {MapStore<Purse, string>} */
      byVal: makeScalarMap(),
    },
    payment: {
      /** @type {MapStore<string, Payment>} */
      bySlot: makeScalarMap(),
      /** @type {MapStore<Payment, string>} */
      byVal: makeScalarMap(),
    },
    // TODO: offer, contact, dapp
  };
  const sharedData = {
    /** @type {MapStore<string, unknown>} */
    bySlot: makeScalarMap(),
    /** @type {MapStore<unknown, string>} */
    byVal: makeScalarMap(),
  };

  /**
   * @param {string} slot
   * @param {string} _iface
   */
  const slotToVal = (slot, _iface) => {
    if (sharedData.bySlot.has(slot)) {
      return sharedData.bySlot.get(slot);
    }
    const kind = Object.keys(myData).find(k => slot.startsWith(k));
    assert(kind, X`bad slot kind: ${slot}`);
    const id = slot.slice(kind.length + 1);
    const val = myData[kind].bySlot.get(id); // or throw
    return val;
  };

  let unknownNonce = 0;

  const valToSlot = val => {
    if (sharedData.byVal.has(val)) {
      return sharedData.byVal.get(val);
    }
    for (const kind of Object.keys(myData)) {
      if (myData[kind].byVal.has(val)) {
        const id = myData[kind].byVal.get(val);
        return `${kind}:${id}`;
      }
    }
    unknownNonce += 1;
    const slot = `unknown:${unknownNonce}`;
    sharedData.byVal.init(val, slot);
    sharedData.bySlot.init(slot, val);
    return slot;
  };

  const makeSaver = (kind, tables) => {
    let nonce = 0;
    return val => {
      const slot = `${(nonce += 1)}`;
      tables.bySlot.init(slot, val);
      tables.byVal.init(val, slot);
    };
  };

  return harden({
    savePurseActions: makeSaver('purse', myData.purse),
    savePaymentActions: makeSaver('payment', myData.payment),
    /**
     * @param {string} id
     * @param {Purse} purse
     */
    initPurseId: (id, purse) => {
      myData.purse.bySlot.init(id, purse);
      myData.purse.byVal.init(purse, id);
    },
    purseEntries: myData.purse.bySlot.entries,
    /**
     * @param {string} id
     * @param {unknown} val
     */
    initBoardId: (id, val) => {
      sharedData.bySlot.init(id, val);
      sharedData.byVal.init(val, id);
    },
    /**
     * @param {string} id
     * @param {unknown} val
     */
    ensureBoardId: (id, val) => {
      if (sharedData.byVal.has(val)) {
        assert.equal(sharedData.byVal.get(val), id);
        return;
      }
      sharedData.bySlot.init(id, val);
      sharedData.byVal.init(val, id);
    },
    ...makeMarshal(valToSlot, slotToVal),
  });
};

const defaultMakePresence = iface => {
  const severed = `SEVERED: ${iface.replace(/^Alleged: /, '')}`;
  const thing = /** @type {any} */ (Far(severed, {}));
  return thing;
};

/**
 * Make context for unserializing wallet or board data.
 *
 * @param {(iface: string) => unknown} [makePresence]
 */
export const makeImportContext = (makePresence = defaultMakePresence) => {
  // constraint: none of these keys has another as a prefix.
  // and none overlaps with board
  const myData = {
    purse: {
      /** @type {MapStore<string, PurseActions>} */
      bySlot: makeScalarMap(),
      /** @type {MapStore<PurseActions, string>} */
      byVal: makeScalarMap(),
    },
    payment: {
      /** @type {MapStore<string, PaymentActions>} */
      bySlot: makeScalarMap(),
      /** @type {MapStore<PaymentActions, string>} */
      byVal: makeScalarMap(),
    },
    // TODO: 6 in total, right?
  };
  const sharedData = {
    /** @type {MapStore<string, unknown>} */
    bySlot: makeScalarMap(),
    /** @type {MapStore<unknown, string>} */
    byVal: makeScalarMap(),
  };

  const kindOf = slot => Object.keys(myData).find(k => slot.startsWith(k));

  const slotToVal = {
    /**
     * @param {string} slot
     * @param {string} iface
     */
    fromBoard: (slot, iface) => {
      if (sharedData.bySlot.has(slot)) {
        return sharedData.bySlot.get(slot);
      }
      const kind = kindOf(slot);
      if (kind) {
        assert.fail(X`bad shared slot ${q(slot)}`);
      }
      // TODO: assert(slot.startswith('board'))?
      const it = makePresence(iface);

      sharedData.bySlot.init(slot, it);
      sharedData.byVal.init(it, slot);
      return it;
    },

    /**
     * @param {string} slot
     * @param {string} iface
     */
    fromMyWallet: (slot, iface) => {
      const kind = kindOf(slot);
      const key = kind ? slot.slice(kind.length + 1) : slot;
      const table = kind ? myData[kind] : sharedData;
      if (table.bySlot.has(key)) {
        return table.bySlot.get(key);
      }

      const it = makePresence(iface);
      table.bySlot.init(key, it);
      table.byVal.init(it, key);
      return it;
    },
  };

  const valToSlot = {
    fromMyWallet: val => {
      for (const kind of Object.keys(myData)) {
        if (myData[kind].byVal.has(val)) {
          const id = myData[kind].byVal.get(val);
          return `${kind}:${id}`;
        }
      }
      assert.fail(X`cannot serialize unregisterd ${val}`);
    },
  };

  const marshal = {
    fromBoard: makeMarshal(undefined, slotToVal.fromBoard, {
      marshalName: 'fromBoard',
    }),
    fromMyWallet: makeMarshal(valToSlot.fromMyWallet, slotToVal.fromMyWallet, {
      marshalName: 'fromPart',
    }),
  };

  return harden({
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
  let it;
  const hp = new HandledPromise((resolve, reject, resolveWithPresence) => {
    it = resolveWithPresence(handler);
  });
  assert(it);
  assert(hp);
  return Remotable(iface, undefined, it);
};

/**
 * @param {string} iface
 * @param {(parts: unknown[]) => void} log
 */
export const makeLoggingPresence = (iface, log) => {
  /** @type {any} */ // TODO: solve types puzzle
  const it = makePresence(iface, {
    applyMethod: (target, method, args) => {
      log(harden(['applyMethod', target, method, args]));
    },
    applyFunction: (target, args) => {
      log(harden(['applyFunction', target, args]));
    },
  });
  return it;
};
