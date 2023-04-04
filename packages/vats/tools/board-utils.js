// @ts-check
/**
 * Should be a union with Remotable, but that's `any`, making this type meaningless
 *
 * @typedef {{ getBoardId: () => string }} BoardRemote
 */
/**
 * @typedef {{
 *   brand: BoardRemote & Brand,
 *   denom: string,
 *   displayInfo: DisplayInfo,
 *   issuer: BoardRemote & Issuer,
 *   issuerName: string,
 *   proposedName: string,
 * }} VBankAssetDetail
 */
/**
 * @typedef {{
 *   brand: Record<string, Brand>,
 *   instance: Record<string, Instance>,
 *   vbankAsset: Record<string, VBankAssetDetail>,
 *   timerBrand: Record<string, import('@agoric/time').TimerBrand>,
 *   reverse: Record<string, string>,
 * }} AgoricNamesRemotes
 */

import { Fail } from '@agoric/assert';
import { Far } from '@endo/marshal';

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
 * @param {import("@agoric/internal/src/storage-test-utils.js").FakeStorageKit} fakeStorageKit
 * @returns {AgoricNamesRemotes}
 */
export const makeAgoricNamesRemotesFromFakeStorage = fakeStorageKit => {
  const { data } = fakeStorageKit;

  const reverse = {};
  // TODO support vbankAsset which must recur
  const entries = ['brand', 'instance', 'timerBrand'].map(kind => {
    const key = `published.agoricNames.${kind}`;

    const values = data.get(key);
    if (!(values && values.length > 0)) throw Fail`no data for ${key}`;
    /** @type {import("@endo/marshal").CapData<string>} */
    const latestCapData = JSON.parse(values.at(-1));
    /** @type {Array<[string, import('@agoric/vats/tools/board-utils.js').BoardRemote]>} */
    const parts = JSON.parse(latestCapData.body).map(([name, slotInfo]) => [
      name,
      makeBoardRemote({
        boardId: latestCapData.slots[slotInfo.index],
        iface: slotInfo.iface,
      }),
    ]);
    for (const [name, remote] of parts) {
      reverse[remote.getBoardId()] = name;
    }
    return [kind, Object.fromEntries(parts)];
  });
  return { ...Object.fromEntries(entries), reverse };
};
harden(makeAgoricNamesRemotesFromFakeStorage);

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
