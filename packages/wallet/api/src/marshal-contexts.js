// @ts-check
import { makeScalarMap } from '@agoric/store';
import { Far, makeMarshal, Remotable } from '@endo/marshal';
import { HandledPromise } from '@endo/eventual-send'; // TODO: convince tsc this isn't needed

const { details: X, quote: q } = assert;

/**
 * Make context for exporting wallet data where brands etc. can be recognized by boardId.
 *
 * All purses, brands, etc. must be registered before serialization / unserialization.
 * Neither the serializer nor the unserializer creates new presences.
 */
export const makeExportContext = () => {
  const toVal = {
    /** @type {MapStore<string, Purse>} */
    purse: makeScalarMap(),
    /** @type {MapStore<string, Brand>} */
    brand: makeScalarMap(),
    /** @type {MapStore<string, Issuer>} */
    issuer: makeScalarMap(),
    // TODO: 6 in total, right?
    // offer
    // contact
    // dapp
  };
  const fromVal = {
    /** @type {MapStore<Purse, string>} */
    purse: makeScalarMap(),
    /** @type {MapStore<Brand, string>} */
    brand: makeScalarMap(),
    /** @type {MapStore<Issuer, string>} */
    issuer: makeScalarMap(),
    // TODO: 6 in total, right?
  };
  /** @type {MapStore<unknown, string>} */
  const sharedData = makeScalarMap();

  /**
   * @param {string} slot
   * @param {string} _iface
   */
  const slotToVal = (slot, _iface) => {
    const kind = Object.keys(toVal).find(k => slot.startsWith(k));
    assert(kind, X`bad slot kind: ${slot}`);
    const id = slot.slice(kind.length + 1);
    const val = toVal[kind].get(id); // or throw
    return val;
  };

  const valToSlot = val => {
    if (sharedData.has(val)) {
      return sharedData.get(val);
    }
    for (const kind of Object.keys(fromVal)) {
      if (fromVal[kind].has(val)) {
        const id = fromVal[kind].get(val);
        return `${kind}:${id}`;
      }
    }
    assert.fail(X`cannot serialize ${val}`);
  };

  return harden({
    initPurseId: (id, purse) => {
      toVal.purse.init(id, purse);
      fromVal.purse.init(purse, id);
    },
    purseEntries: toVal.purse.entries,
    initBrandId: (id, brand) => {
      toVal.brand.init(id, brand);
      fromVal.brand.init(brand, id);
    },
    brandEntries: toVal.purse.entries,
    initIssuerId: (id, issuer) => {
      toVal.issuer.init(id, issuer);
      fromVal.issuer.init(issuer, id);
    },
    initBoardId: (id, val) => {
      sharedData.init(val, id);
    },
    issuerEntries: toVal.purse.entries,
    ...makeMarshal(valToSlot, slotToVal),
  });
};

/**
 * Make context for unserializing wallet or board data.
 */
export const makeImportContext = () => {
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
  /** @type {MapStore<string, unknown>} */
  const sharedData = makeScalarMap();

  const kindOf = slot => Object.keys(myData).find(k => slot.startsWith(k));
  const makePresence = (slot, iface) => {
    const severed = `SEVERED: ${iface.replace(/^Alleged: /, '')}`;
    const thing = /** @type {any} */ (Far(severed, {}));
    return thing;
  };

  const slotToVal = {
    /**
     * @param {string} slot
     * @param {string} iface
     */
    fromBoard: (slot, iface) => {
      if (sharedData.has(slot)) {
        return sharedData.get(slot);
      }
      const kind = kindOf(slot);
      if (kind) {
        assert.fail(X`bad shared slot ${q(slot)}`);
      }
      // TODO: assert(slot.startswith('board'))?
      const it = makePresence(slot, iface);

      sharedData.init(slot, it);
      return it;
    },

    /**
     * @param {string} slot
     * @param {string} iface
     */
    fromPart: (slot, iface) => {
      const kind = kindOf(slot);
      const key = kind ? slot.slice(kind.length + 1) : slot;
      const table = kind ? myData[kind].bySlot : sharedData;
      if (table.has(key)) {
        return table.get(key);
      }

      const it = makePresence(slot, iface);
      table.init(key, it);
      return it;
    },
  };

  const valToSlot = {
    fromWallet: val => {
      for (const kind of Object.keys(myData)) {
        if (myData[kind].byVal.has(val)) {
          const id = myData[kind].byVal.get(val);
          return `${kind}:${id}`;
        }
      }
      throw Error(`valToSlot(${val})???@@@`);
    },
  };

  const marshal = {
    fromBoard: makeMarshal(undefined, slotToVal.fromBoard, {
      marshalName: 'fromBoard',
    }),
    fromPart: makeMarshal(valToSlot.fromWallet, slotToVal.fromPart, {
      marshalName: 'fromPart',
    }),
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
    fromWallet: Far('wallet marshaller', { ...marshal.fromPart }),
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
