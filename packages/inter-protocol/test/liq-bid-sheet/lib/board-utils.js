import { Far } from './marshal.js';

/**
 * @param {*} slotInfo
 * @returns {BoardRemote}
 */
export const makeBoardRemote = ({ boardId, iface }) => {
  const nonalleged =
    iface && iface.length ? iface.slice('Alleged: '.length) : '';
  return Far(`BoardRemote${nonalleged}`, { getBoardId: () => boardId });
};

/**
 * Like makeMarshal but,
 * - slotToVal takes an iface arg
 * - if a part being serialized has getBoardId(), it passes through as a slot value whereas the normal marshaller would treat it as a copyRecord
 *
 * @param {(slot: string, iface: string) => any} slotToVal
 * @returns {import('@endo/marshal').Marshal<string>}
 */
export const boardSlottingMarshaller = (slotToVal = (s, _i) => s) => ({
  /** @param {{body: string, slots: string[]}} capData */
  unserialize: ({ body, slots }) => {
    const reviver = (_key, obj) => {
      const qclass = obj !== null && typeof obj === 'object' && obj['@qclass'];
      // NOTE: hilbert hotel not impl
      switch (qclass) {
        case 'slot': {
          const { index, iface } = obj;
          return slotToVal(slots[index], iface);
        }
        case 'bigint':
          return BigInt(obj.digits);
        case 'undefined':
          return undefined;
        default:
          return obj;
      }
    };
    return JSON.parse(body, reviver);
  },
  serialize: whole => {
    /** @type {Map<string, number>} */
    const seen = new Map();
    /** @type {(boardId: string) => number} */
    const slotIndex = boardId => {
      let index = seen.get(boardId);
      if (index === undefined) {
        index = seen.size;
        seen.set(boardId, index);
      }
      return index;
    };
    const recur = part => {
      if (part === null) return null;
      if (typeof part === 'bigint') {
        return { '@qclass': 'bigint', digits: `${part}` };
      }
      if (Array.isArray(part)) {
        return part.map(recur);
      }
      if (typeof part === 'object') {
        if ('getBoardId' in part) {
          const index = slotIndex(part.getBoardId());
          return { '@qclass': 'slot', index };
        }
        return Object.fromEntries(
          Object.entries(part).map(([k, v]) => [k, recur(v)]),
        );
      }
      return part;
    };
    const after = recur(whole);
    return { body: JSON.stringify(after), slots: [...seen.keys()] };
  },
});
