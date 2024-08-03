/** @file copied from packages/agoric-cli */
// TODO DRY in https://github.com/Agoric/agoric-sdk/issues/9109
// @ts-check
/* global Buffer */

import {
  boardSlottingMarshaller,
  makeBoardRemote,
} from '@agoric/internal/src/marshal.js';
import { Fail } from '@endo/errors';

export { boardSlottingMarshaller };

export const boardValToSlot = val => {
  if ('getBoardId' in val) {
    return val.getBoardId();
  }
  Fail`unknown obj in boardSlottingMarshaller.valToSlot ${val}`;
};

export const networkConfigUrl = agoricNetSubdomain =>
  `https://${agoricNetSubdomain}.agoric.net/network-config`;
export const rpcUrl = agoricNetSubdomain =>
  `https://${agoricNetSubdomain}.rpc.agoric.net:443`;

/**
 * @typedef {{ rpcAddrs: string[], chainName: string }} MinimalNetworkConfig
 */

/** @type {MinimalNetworkConfig} */
const networkConfig = {
  rpcAddrs: ['http://0.0.0.0:26657'],
  chainName: 'agoriclocal',
};
export { networkConfig };
// console.warn('networkConfig', networkConfig);

/**
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
    getJSON(url(path, { kind, height }))
      .catch(err => {
        throw Error(`cannot read ${kind} of ${path}: ${err.message}`);
      })
      .then(data => {
        const {
          result: { response },
        } = data;
        if (response?.code !== 0) {
          /** @type {any} */
          const err = Error(
            `error code ${response?.code} reading ${kind} of ${path}: ${response.log}`,
          );
          err.code = response?.code;
          err.codespace = response?.codespace;
          throw err;
        }
        return data;
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
      await null;
      do {
        // console.debug('READING', { blockHeight });
        let values;
        try {
          ({ blockHeight, values } = await this.readAt(
            path,
            blockHeight && Number(blockHeight) - 1,
          ));
          // console.debug('readAt returned', { blockHeight });
        } catch (err) {
          if (
            // CosmosSDK ErrNotFound; there is no data at the path
            (err.codespace === 'sdk' && err.code === 38) ||
            // CosmosSDK ErrUnknownRequest; misrepresentation of the same until
            // https://github.com/Agoric/agoric-sdk/commit/dafc7c1708977aaa55e245dc09a73859cf1df192
            // TODO remove after upgrade-12
            err.message.match(/unknown request/)
          ) {
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
      boardSlottingMarshaller(ctx.convertSlotToVal).fromCapData(capData),
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
  await null;
  try {
    const vstorage = makeVStorage({ fetch }, config);
    const fromBoard = makeFromBoard();
    const agoricNames = await makeAgoricNames(fromBoard, vstorage);

    const marshaller = boardSlottingMarshaller(fromBoard.convertSlotToVal);

    /** @type {(txt: string) => unknown} */
    const unserializeHead = txt =>
      storageHelper.unserializeTxt(txt, fromBoard).at(-1);

    /** @type {(path: string) => Promise<unknown>} */
    const readLatestHead = path =>
      vstorage.readLatest(path).then(unserializeHead);

    return {
      agoricNames,
      fromBoard,
      marshaller,
      readLatestHead,
      unserializeHead,
      vstorage,
    };
  } catch (err) {
    throw Error(`RPC failure (${config.rpcAddrs}): ${err.message}`);
  }
};
/** @typedef {Awaited<ReturnType<typeof makeRpcUtils>>} RpcUtils */
