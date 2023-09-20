// @ts-check
'use strict';

const {
  create,
  entries,
  fromEntries,
  freeze,
  keys,
  setPrototypeOf,
  prototype: objectPrototype,
} = Object;
const { isArray } = Array;

const sigilDoc = {
  '!': 'escaped string',
  '+': `non-negative bigint`,
  '-': `negative bigint`,
  '#': `manifest constant`,
  '%': `symbol`,
  $: `remotable`,
  '&': `promise`,
};
const sigils = keys(sigilDoc).join('');

/** @type {<V, U>(obj: Record<string, V>, f: (v: V) => U) => Record<string, U>} */
const objMap = (obj, f) =>
  fromEntries(entries(obj).map(([p, v]) => [f(p), f(v)]));

const { freeze: harden } = Object; // XXX

const makeMarshal = (_v2s, convertSlotToVal = (s, _i) => s) => {
  const fromCapData = ({ body, slots }) => {
    const recur = v => {
      switch (typeof v) {
        case 'boolean':
        case 'number':
          return v;
        case 'string':
          if (v === '') return v;
          const sigil = v.slice(0, 1);
          if (!sigils.includes(sigil)) return v;
          switch (sigil) {
            case '!':
              return v.slice(1);
            case '+':
              return BigInt(v.slice(1));
            case '-':
              return -BigInt(v.slice(1));
            case '$': {
              const [ix, iface] = v.slice(1).split('.');
              return convertSlotToVal(slots[Number(ix)], iface);
            }
            case '#':
              switch (v) {
                case '#undefined':
                  return undefined;
                case '#Infinity':
                  return Infinity;
                case '#NaN':
                  return Infinity;
                default:
                  throw RangeError(`Unexpected constant ${v}`);
              }
            case '%':
              // TODO: @@asyncIterator
              return Symbol.for(v.slice(1));
            default:
              throw RangeError(`Unexpected sigil ${sigil}`);
          }
        case 'object':
          if (v === null) return v;
          if (isArray(v)) {
            return freeze(v.map(recur));
          }
          return freeze(objMap(v, recur));
        default:
          throw RangeError(`Unexpected value type ${typeof v}`);
      }
    };
    const encoding = JSON.parse(body.replace(/^#/, ''));
    return recur(encoding);
  };

  const toCapData = () => {
    throw Error('not implemented');
  };

  return harden({
    fromCapData,
    unserialize: fromCapData,
    toCapData,
    serialize: toCapData,
  });
};

const PASS_STYLE = Symbol.for('passStyle');
export const Far = (iface, methods) => {
  const proto = freeze(
    create(objectPrototype, {
      [PASS_STYLE]: { value: 'remotable' },
      [Symbol.toStringTag]: { value: iface },
    }),
  );
  setPrototypeOf(methods, proto);
  freeze(methods);
  return methods;
};

// #region marshal-table
const makeSlot1 = (val, serial) => {
  const prefix = Promise.resolve(val) === val ? 'promise' : 'object';
  return `${prefix}${serial}`;
};

const makeTranslationTable = (makeSlot, makeVal) => {
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
// #endregion marshal-table

export { makeMarshal, makeTranslationTable };
