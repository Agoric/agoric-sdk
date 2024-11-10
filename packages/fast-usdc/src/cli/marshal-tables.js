import { Far, makeMarshal } from '@endo/marshal';

/**
 * @template Val
 * @param {(val: Val, size: number) => unknown} makeSlot
 * @param {(slot: unknown, iface: string | undefined) => Val} makeVal
 * @returns
 */
const makeTranslationTable = (makeSlot, makeVal) => {
  /** @type {Map<Val, unknown>} */
  const valToSlot = new Map();
  /** @type {Map<unknown, Val>} */
  const slotToVal = new Map();

  /** @type {(val: Val) => unknown} */
  const convertValToSlot = val => {
    if (valToSlot.has(val)) return valToSlot.get(val);
    const slot = makeSlot(val, valToSlot.size);
    valToSlot.set(val, slot);
    slotToVal.set(slot, val);
    return slot;
  };

  /** @type {(slot: unknown, iface: string | undefined) => Val} */
  const convertSlotToVal = (slot, iface) => {
    if (slot === null) return makeVal(slot, iface);
    if (slotToVal.has(slot)) return slotToVal.get(slot);
    const val = makeVal(slot, iface);
    valToSlot.set(val, slot);
    slotToVal.set(slot, val);
    return val;
  };

  return harden({ convertValToSlot, convertSlotToVal });
};

/** @type {(slot: unknown, iface: string | undefined) => any} */
const synthesizeRemotable = (slot, iface) =>
  Far(`${(iface ?? '').replace(/^Alleged: /, '')}#${slot}`, {});

export const makeClientMarshaller = () => {
  const { convertValToSlot, convertSlotToVal } = makeTranslationTable(val => {
    throw new Error(`unknown value: ${val}`);
  }, synthesizeRemotable);

  return makeMarshal(convertValToSlot, convertSlotToVal, {
    serializeBodyFormat: 'smallcaps',
  });
};
