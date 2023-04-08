// @ts-check
/* eslint-disable @jessie.js/no-nested-await */
/* global Buffer, fetch, process */

import { NonNullish } from '@agoric/assert';
import {
  boardSlottingMarshaller,
  makeBoardRemote,
} from '@agoric/vats/tools/board-utils.js';

export { boardSlottingMarshaller };

export const networkConfigUrl = agoricNetSubdomain =>
  `https://${agoricNetSubdomain}.agoric.net/network-config`;
export const rpcUrl = agoricNetSubdomain =>
  ':' in agoricNetSubdomain
    ? agoricNetSubdomain
    : `https://${agoricNetSubdomain}.rpc.agoric.net:443`;

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
const localNetworkConfig = {
  rpcAddrs: ['http://0.0.0.0:26657'],
  chainName: 'agoriclocal',
};

/**
 * @param {typeof process.env} env
 * @returns {Promise<MinimalNetworkConfig>}
 */
export const getNetworkConfig = async env => {
  if (!('AGORIC_NET' in env) || env.AGORIC_NET === 'local') {
    return localNetworkConfig;
  }

  return fromAgoricNet(NonNullish(env.AGORIC_NET)).catch(err => {
    throw Error(
      `cannot get network config (${env.AGORIC_NET || 'local'}): ${
        err.message
      }`,
    );
  });
};

/** @type {MinimalNetworkConfig} */
export const networkConfig = await getNetworkConfig(process.env);
// console.warn('networkConfig', networkConfig);

/**
 *
 * @param {object} powers
 * @param {typeof window.fetch} powers.fetch
 * @param {MinimalNetworkConfig} config
 */
export const makeVStorage = (powers, config = networkConfig) => {
  /** @param {string} path */
  const getJSON = path => {
    const url = config.rpcAddrs[0] + path;
    // console.warn('fetching', url);
    return powers.fetch(url, { keepalive: true }).then(res => res.json());
  };
  // height=0 is the same as omitting height and implies the highest block
  const url = (path = 'published', { kind = 'children', height = 0 } = {}) =>
    `/abci_query?path=%22/custom/vstorage/${kind}/${path}%22&height=${height}`;

  const readStorage = (path = 'published', { kind = 'children', height = 0 }) =>
    getJSON(url(path, { kind, height })).catch(err => {
      throw Error(`cannot read ${kind} of ${path}: ${err.message}`);
    });

  return {
    url,
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
      const raw = await readStorage(path, { kind: 'data' });
      return this.decode(raw);
    },
    async keys(path = 'published') {
      const raw = await readStorage(path, { kind: 'children' });
      return JSON.parse(this.decode(raw)).children;
    },
    /**
     * @param {string} path
     * @param {number} [height] default is highest
     * @returns {Promise<{blockHeight: number, values: string[]}>}
     */
    async readAt(path, height = undefined) {
      const raw = await readStorage(path, { kind: 'data', height });
      const txt = this.decode(raw);
      /** @type {{ value: string }} */
      const { value } = JSON.parse(txt);
      return JSON.parse(value);
    },
    /**
     * Read values going back as far as available
     *
     * @param {string} path
     * @param {number | string} [minHeight]
     * @returns {Promise<string[]>}
     */
    async readFully(path, minHeight = undefined) {
      const parts = [];
      // undefined the first iteration, to query at the highest
      let blockHeight;
      do {
        // console.debug('READING', { blockHeight });
        let values;
        try {
          // eslint-disable-next-line no-await-in-loop
          ({ blockHeight, values } = await this.readAt(
            path,
            blockHeight && Number(blockHeight) - 1,
          ));
          // console.debug('readAt returned', { blockHeight });
        } catch (err) {
          if ('log' in err && err.log.match(/unknown request/)) {
            // console.error(err);
            break;
          }
          throw err;
        }
        parts.push(values);
        // console.debug('PUSHED', values);
        // console.debug('NEW', { blockHeight, minHeight });
        if (minHeight && Number(blockHeight) <= Number(minHeight)) break;
      } while (blockHeight > 0);
      return parts.flat();
    },
  };
};
/** @typedef {ReturnType<typeof makeVStorage>} VStorage */

export const makeFromBoard = () => {
  const cache = new Map();
  const convertSlotToVal = (boardId, iface) => {
    if (cache.has(boardId)) {
      return cache.get(boardId);
    }
    const val = makeBoardRemote({ boardId, iface });
    cache.set(boardId, val);
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
 * @returns {Promise<import('@agoric/vats/tools/board-utils.js').AgoricNamesRemotes>}
 */
export const makeAgoricNames = async (ctx, vstorage) => {
  const reverse = {};
  const entries = await Promise.all(
    ['brand', 'instance', 'vbankAsset'].map(async kind => {
      const content = await vstorage.readLatest(
        `published.agoricNames.${kind}`,
      );
      /** @type {Array<[string, import('@agoric/vats/tools/board-utils.js').BoardRemote]>} */
      const parts = storageHelper.unserializeTxt(content, ctx).at(-1);
      for (const [name, remote] of parts) {
        if ('getBoardId' in remote) {
          reverse[remote.getBoardId()] = name;
        }
      }
      return [kind, Object.fromEntries(parts)];
    }),
  );
  return { ...Object.fromEntries(entries), reverse };
};

/**
 * @param {{ fetch: typeof window.fetch }} io
 * @param {MinimalNetworkConfig} config
 */
export const makeRpcUtils = async ({ fetch }, config = networkConfig) => {
  try {
    const vstorage = makeVStorage({ fetch }, config);
    const fromBoard = makeFromBoard();
    const agoricNames = await makeAgoricNames(fromBoard, vstorage);

    const unserializer = boardSlottingMarshaller(fromBoard.convertSlotToVal);

    /** @type {(txt: string) => unknown} */
    const unserializeHead = txt =>
      storageHelper.unserializeTxt(txt, fromBoard).at(-1);

    /** @type {(path: string) => Promise<unknown>} */
    const readLatestHead = path =>
      vstorage.readLatest(path).then(unserializeHead);

    return {
      agoricNames,
      fromBoard,
      readLatestHead,
      unserializeHead,
      unserializer,
      vstorage,
    };
  } catch (err) {
    throw new Error(`RPC failure (${config.rpcAddrs}): ${err.message}`);
  }
};
/** @typedef {Awaited<ReturnType<typeof makeRpcUtils>>} RpcUtils */

const { freeze } = Object;

/**
 * @param {{
 *   fetch: typeof window.fetch,
 * }} io
 */
export const makeQueryClient = ({ fetch }) => {
  // XXX prune getConfig above

  /**
   * @param {string} opt
   * @returns {Promise<MinimalNetworkConfig>}
   */
  const getConfig = async opt => {
    const [netName, chainName] = opt.split(',');
    if (chainName) {
      return { chainName, rpcAddrs: [rpcUrl(netName)] };
    }
    // XXX ambient fetch
    return fetch(networkConfigUrl(netName)).then(res => res.json());
  };

  /** @param {MinimalNetworkConfig} cfg */
  const make = cfg => {
    const vstorage = makeVStorage({ fetch }, cfg);
    return freeze({
      rpcAddrs: cfg.rpcAddrs,
      chainName: cfg.chainName,
      /** @param {string} opt */
      withConfig: async opt => {
        if (cfg.chainName !== localNetworkConfig.chainName) {
          throw TypeError('already configured');
        }
        const { chainName, rpcAddrs } = await getConfig(opt);
        return make({ chainName, rpcAddrs });
      },
      /** @param {string} path */
      readLatest: path => vstorage.readLatest(path),
      /** @param {string} path */
      readFully: path => vstorage.readFully(path),
      // for compant
      // TODO: makeAgoricNames should take queryClient
      // perhaps fold makeVStorage into makeQueryClient?
      vstorage,
    });
  };
  return make(localNetworkConfig);
};
/** @typedef {ReturnType<makeQueryClient>} QueryClient */

/** @param {QueryClient} qClient */
export const makeBoardClient = qClient => {
  const fromBoard = makeFromBoard();
  /** @type {Awaited<ReturnType<makeAgoricNames>>} */
  let agoricNames;

  const marshaller = boardSlottingMarshaller(fromBoard.convertSlotToVal);
  const unserializeTxt = txt => {
    const { capDatas } = storageHelper.parseCapData(txt);
    return capDatas.map(capData => marshaller.unserialize(capData));
  };

  /** @type {(txt: string) => unknown} */
  const unserializeHead = txt => unserializeTxt(txt).at(-1);

  return freeze({
    qClient,
    serialize: obj => marshaller.serialize(obj),
    provideAgoricNames: async () => {
      if (agoricNames) return agoricNames;
      agoricNames = await makeAgoricNames(fromBoard, qClient.vstorage);
      return agoricNames;
    },
    /** @type {(path: string) => Promise<unknown>} */
    readLatestHead: path => qClient.readLatest(path).then(unserializeHead),
  });
};
/** @typedef {ReturnType<makeBoardClient>} BoardClient */
