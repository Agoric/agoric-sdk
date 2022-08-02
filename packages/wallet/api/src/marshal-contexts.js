// @ts-check
import { makeScalarMap } from '@agoric/store';
import { Far, makeMarshal } from '@endo/marshal';

const { details: X, quote: q } = assert;

const makePresence = (_slot, iface) => {
  const severed = `SEVERED: ${iface.replace(/^Alleged: /, '')}`;
  const thing = /** @type {any} */ (Far(severed, {}));
  return thing;
};

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
  };
  const fromVal = {
    /** @type {MapStore<Purse, string>} */
    purse: makeScalarMap(),
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

  let nonce = 0;

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
    nonce += 1;
    const slot = `unknown:${nonce}`;
    sharedData.init(val, slot);
    return slot;
  };

  return harden({
    initPurseId: (id, purse) => {
      toVal.purse.init(id, purse);
      fromVal.purse.init(purse, id);
    },
    purseEntries: toVal.purse.entries,
    // Public values.
    initBoardId: (id, val) => {
      sharedData.init(val, id);
    },
    ensureBoardId: (id, val) => {
      if (sharedData.has(val)) return;
      sharedData.init(val, id);
    },
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
    /** @type {MapStore<string, Purse>} */
    purse: makeScalarMap(),
  };
  /** @type {MapStore<string, unknown>} */
  const sharedData = makeScalarMap();

  const kindOf = slot => Object.keys(myData).find(k => slot.startsWith(k));

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
      const table = kind ? myData[kind] : sharedData;
      if (table.has(key)) {
        return table.get(key);
      }

      const it = makePresence(slot, iface);
      table.init(key, it);
      return it;
    },
  };

  const marshal = {
    fromBoard: makeMarshal(undefined, slotToVal.fromBoard, {
      marshalName: 'fromBoard',
    }),
    fromPart: makeMarshal(undefined, slotToVal.fromPart, {
      marshalName: 'fromPart',
    }),
  };

  return harden({
    fromWallet: Far('wallet unserializer', {
      unserialize: marshal.fromPart.unserialize,
    }),
    fromBoard: Far('unserializer from board', {
      /**
       * @throws on an attempt to refer to un-published wallet objects.
       */
      unserialize: marshal.fromBoard.unserialize,
    }),
  });
};
