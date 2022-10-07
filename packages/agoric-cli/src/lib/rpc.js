// @ts-check
/* eslint-disable @jessie.js/no-nested-await */
/* global Buffer, fetch, process */

import { NonNullish } from '@agoric/assert';

/**
 * @typedef {{boardId: string, iface: string}} RpcRemote
 */

export const networkConfigUrl = agoricNetSubdomain =>
  `https://${agoricNetSubdomain}.agoric.net/network-config`;
export const rpcUrl = agoricNetSubdomain =>
  `https://${agoricNetSubdomain}.rpc.agoric.net:443`;

/**
 * @typedef {{ rpcAddrs: string[], chainName: string }} MinimalNetworkConfig
 */

/**
 *  @param {string} str
 * @returns {Promise<MinimalNetworkConfig>}
 */
const fromAgoricNet = str => {
  const [netName, chainName] = str.split(',');
  if (chainName) {
    return Promise.resolve({ chainName, rpcAddrs: [rpcUrl(netName)] });
  }
  return fetch(networkConfigUrl(netName)).then(res => res.json());
};

/** @type {MinimalNetworkConfig} */
export const networkConfig =
  'AGORIC_NET' in process.env && process.env.AGORIC_NET !== 'local'
    ? await fromAgoricNet(NonNullish(process.env.AGORIC_NET))
    : { rpcAddrs: ['http://0.0.0.0:26657'], chainName: 'agoriclocal' };
// console.warn('networkConfig', networkConfig);

/**
 *
 * @param {object} powers
 * @param {typeof window.fetch} powers.fetch
 */
export const makeVStorage = powers => {
  const getJSON = path => {
    const url = networkConfig.rpcAddrs[0] + path;
    // console.warn('fetching', url);
    return powers.fetch(url, { keepalive: true }).then(res => res.json());
  };

  return {
    // height=0 is the same as omitting height and implies the highest block
    url: (path = 'published', { kind = 'children', height = 0 } = {}) =>
      `/abci_query?path=%22/custom/vstorage/${kind}/${path}%22&height=${height}`,
    decode({ result: { response } }) {
      const { code } = response;
      if (code !== 0) {
        throw response;
      }
      const { value } = response;
      return Buffer.from(value, 'base64').toString();
    },
    /**
     *
     * @param {string} path
     * @returns {Promise<string>} latest vstorage value at path
     */
    async readLatest(path = 'published') {
      const raw = await getJSON(this.url(path, { kind: 'data' }));
      return this.decode(raw);
    },
    async keys(path = 'published') {
      const raw = await getJSON(this.url(path, { kind: 'children' }));
      return JSON.parse(this.decode(raw)).children;
    },
    /**
     * @param {string} path
     * @param {number} [height] default is highest
     * @returns {Promise<{blockHeight: number, values: string[]}>}
     */
    async readAt(path, height = undefined) {
      const raw = await getJSON(this.url(path, { kind: 'data', height }));
      const txt = this.decode(raw);
      /** @type {{ value: string }} */
      const { value } = JSON.parse(txt);
      return JSON.parse(value);
    },
    /**
     * Read values going back as far as available
     *
     * @param {string} path
     * @returns {Promise<string[]>}
     */
    async readFully(path) {
      const parts = [];
      // undefined the first iteration, to query at the highest
      let blockHeight;
      do {
        console.debug('READING', { blockHeight });
        let values;
        try {
          // eslint-disable-next-line no-await-in-loop
          ({ blockHeight, values } = await this.readAt(
            path,
            blockHeight && blockHeight - 1,
          ));
          console.debug('readAt returned', { blockHeight });
        } catch (err) {
          if ('log' in err && err.log.match(/unknown request/)) {
            console.error(err);
            break;
          }
          throw err;
        }
        parts.push(values);
        console.debug('PUSHED', values);
        console.debug('NEW', { blockHeight });
      } while (blockHeight > 0);
      return parts.flat();
    },
  };
};
/** @typedef {ReturnType<typeof makeVStorage>} VStorage */

/**
 * Like makeMarshal but,
 * - slotToVal takes an iface arg
 * - if a part being serialized has a boardId property, it passes through as a slot value whereas the normal marshaller would treat it as a copyRecord
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
    const seen = new Map();
    const slotIndex = v => {
      if (seen.has(v)) {
        return seen.get(v);
      }
      const index = seen.size;
      seen.set(v, index);
      return { index, iface: v.iface };
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
        if ('boardId' in part) {
          return { '@qclass': 'slot', ...slotIndex(part.boardId) };
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

export const makeFromBoard = (slotKey = 'boardId') => {
  const cache = new Map();
  const convertSlotToVal = (slot, iface) => {
    if (cache.has(slot)) {
      return cache.get(slot);
    }
    const val = harden({ [slotKey]: slot, iface });
    cache.set(slot, val);
    return val;
  };
  return harden({ convertSlotToVal });
};
/** @typedef {ReturnType<typeof makeFromBoard>} IdMap */

export const storageHelper = {
  /** @param { string } txt */
  parseCapData: txt => {
    assert(typeof txt === 'string', typeof txt);
    /** @type {{ value: string }} */
    const { value } = JSON.parse(txt);
    const specimen = JSON.parse(value);
    const { blockHeight, values } = specimen;
    assert(values, `empty values in specimen ${value}`);
    const capDatas = storageHelper.parseMany(values);
    return { blockHeight, capDatas };
  },
  /**
   * @param {string} txt
   * @param {IdMap} ctx
   */
  unserializeTxt: (txt, ctx) => {
    const { capDatas } = storageHelper.parseCapData(txt);
    return capDatas.map(capData =>
      boardSlottingMarshaller(ctx.convertSlotToVal).unserialize(capData),
    );
  },
  /** @param {string[]} capDataStrings array of stringified capData */
  parseMany: capDataStrings => {
    assert(capDataStrings && capDataStrings.length);
    /** @type {{ body: string, slots: string[] }[]} */
    const capDatas = capDataStrings.map(s => JSON.parse(s));
    for (const capData of capDatas) {
      assert(typeof capData === 'object' && capData !== null);
      assert('body' in capData && 'slots' in capData);
      assert(typeof capData.body === 'string');
      assert(Array.isArray(capData.slots));
    }
    return capDatas;
  },
};
harden(storageHelper);

/**
 * @param {IdMap} ctx
 * @param {VStorage} vstorage
 * @returns {Promise<{ brand: Record<string, RpcRemote>, instance: Record<string, RpcRemote>, reverse: Record<string, string> }>}
 */
export const makeAgoricNames = async (ctx, vstorage) => {
  const reverse = {};
  const entries = await Promise.all(
    ['brand', 'instance'].map(async kind => {
      const content = await vstorage.readLatest(
        `published.agoricNames.${kind}`,
      );
      const parts = storageHelper.unserializeTxt(content, ctx).at(-1);
      for (const [name, remote] of parts) {
        reverse[remote.boardId] = name;
      }
      return [kind, Object.fromEntries(parts)];
    }),
  );
  return { ...Object.fromEntries(entries), reverse };
};

export const makeRpcUtils = async ({ fetch }) => {
  const vstorage = makeVStorage({ fetch });
  const fromBoard = makeFromBoard();
  const agoricNames = await makeAgoricNames(fromBoard, vstorage);

  return { vstorage, fromBoard, agoricNames };
};
