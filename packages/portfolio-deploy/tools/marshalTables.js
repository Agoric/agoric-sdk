/**
 * @file marshal tools for vstorage clients
 *
 * TODO: integrate back into @agoric/rpc
 *  - fixes: calls to makeClientMarshaller share static mutable state
 *    https://github.com/Agoric/ui-kit/issues/73
 *  - fits in this plain .js project
 */
/** global harden */
import { Far, makeMarshal } from '@endo/marshal';

/**
 * The null slot indicates that identity is not intended to be preserved.
 *
 * @typedef { string | null } WildSlot
 */

/**
 * Implement conventional parts of convertValToSlot, convertSlotToVal functions
 * for use with makeMarshal based on a slot <-> value translation table,
 * indexed in both directions. Caller supplies functions for making
 * slots, values when not present in the table.
 *
 * @template Val
 * @param {(val: Val, size: number) => string} makeSlot
 * @param {(slot: WildSlot, iface: string | undefined) => Val} makeVal
 */
const makeTranslationTable = (makeSlot, makeVal) => {
  /** @type {Map<Val, string>} */
  const valToSlot = new Map();
  /** @type {Map<string, Val>} */
  const slotToVal = new Map();

  /** @type {(val: Val) => string} */
  const convertValToSlot = val => {
    if (valToSlot.has(val)) {
      // @ts-expect-error https://github.com/microsoft/TypeScript/issues/13086
      return valToSlot.get(val);
    }
    const slot = makeSlot(val, valToSlot.size);
    valToSlot.set(val, slot);
    slotToVal.set(slot, val);
    return slot;
  };

  /** @type {(slot: WildSlot, iface: string | undefined) => Val} */
  const convertSlotToVal = (slot, iface) => {
    if (slot === null) return makeVal(slot, iface);
    if (slotToVal.has(slot)) {
      // @ts-expect-error https://github.com/microsoft/TypeScript/issues/13086
      return slotToVal.get(slot);
    }
    const val = makeVal(slot, iface);
    valToSlot.set(val, slot);
    slotToVal.set(slot, val);
    return val;
  };
  // eslint-disable-next-line no-undef
  return harden({ convertValToSlot, convertSlotToVal });
};

// /** @type {(slot: string, iface: string | undefined) => any} */
/** @type {(slot: string | null, iface: string | undefined) => any} */
const synthesizeRemotable = (slot, iface) => {
  const ifaceStr = iface ?? '';
  const suffix = ifaceStr.endsWith(`#${slot}`) ? '' : `#${slot}`;
  return Far(`${ifaceStr.replace(/^Alleged: /, '')}${suffix}`, {});
};

/**
 * Make a marshaller that synthesizes a remotable the first
 * time it sees a slot identifier, allowing clients to recognize
 * object identity for brands, instances, etc.
 *
 * @param {(v: unknown) => string} [valToSlot]
 */
export const makeClientMarshaller = valToSlot => {
  const noNewSlots = val => {
    throw new Error(`unknown value: ${val}`);
  };
  const { convertValToSlot, convertSlotToVal } = makeTranslationTable(
    valToSlot || noNewSlots,
    synthesizeRemotable,
  );

  return makeMarshal(convertValToSlot, convertSlotToVal, {
    serializeBodyFormat: 'smallcaps',
  });
};
