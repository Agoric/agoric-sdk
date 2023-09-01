// @ts-check
import { makeMarshal, Far } from './unmarshal.js';

/**
 * @file board marshaling support
 *
 * XXX import from @agoric/rpc/src/marshal ?
 */

// #region ses polyfill
const { freeze: harden } = Object; // XXX not hardened JS env yet?

const Fail = (template, ...args) => {
  throw Error(String.raw(template, ...args.map(val => String(val))));
};
const assert = (cond, msg) => {
  if (!cond) {
    throw Error(msg);
  }
};

assert.typeof = (specimen, ty) => {
  assert(typeof specimen === ty);
};
// #endregion

/**
 * @param {(v: unknown, nonce: number) => unknown} makeSlot
 * @param {(s: unknown, iface: string?) => unknown} makeVal
 */
export const makeTranslationTable = (makeSlot, makeVal) => {
  const valToSlot = new Map();
  const slotToVal = new Map();

  const convertValToSlot = val => {
    if (valToSlot.has(val)) return valToSlot.get(val);
    const slot = makeSlot(val, valToSlot.size);
    valToSlot.set(val, slot);
    slotToVal.set(slot, val);
    return slot;
  };

  const convertSlotToVal = (slot, iface) => {
    if (slotToVal.has(slot)) return slotToVal.get(slot);
    if (makeVal) {
      const val = makeVal(slot, iface);
      valToSlot.set(val, slot);
      slotToVal.set(slot, val);
      return val;
    }
    throw Error(`no such ${iface}: ${slot}`);
  };

  return harden({ convertValToSlot, convertSlotToVal });
};

/** @type {import('@endo/marshal').MakeMarshalOptions} */
const smallCaps = { serializeBodyFormat: 'smallcaps' };

export const makeBoardMarshaller = () => {
  const synthesizeRemotable = (_slot, iface) =>
    Far(iface.replace(/^Alleged: /, ''), {});

  const { convertValToSlot, convertSlotToVal } = makeTranslationTable(
    slot => Fail`unknown id: ${slot}`,
    synthesizeRemotable,
  );
  return {
    ...makeMarshal(convertValToSlot, convertSlotToVal, smallCaps),
    convertValToSlot,
  };
};

// XXX from lib-chainStorage.js
const isStreamCell = cell =>
  cell &&
  typeof cell === 'object' &&
  Array.isArray(cell.values) &&
  typeof cell.blockHeight === 'string' &&
  /^0$|^[1-9][0-9]*$/.test(cell.blockHeight);

export const extractStreamCellValue = (data, index = -1) => {
  const { value: serialized } = data;

  serialized.length > 0 || Fail`no StreamCell values: ${data}`;

  const streamCell = JSON.parse(serialized);
  if (!isStreamCell(streamCell)) {
    throw Fail`not a StreamCell: ${streamCell}`;
  }

  const { values } = streamCell;
  values.length > 0 || Fail`no StreamCell values: ${streamCell}`;

  const value = values.at(index);
  assert.typeof(value, 'string');
  return value;
};
