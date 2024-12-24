/**
 * @file This file implements methods currently available in
 * packages/client-utils .
 *
 * With the exceptions of:
 * - makeVstorage and mapHistory: copied from `multichain-testing/tools/batchQuery.js`.
 * - makeAPI: copied from `multichain-testing/tools/makeHttpClient.js`.
 *
 * These modifications were made to address the issue described in #10574.
 */

// @ts-check

import {
  boardSlottingMarshaller,
  makeBoardRemote,
} from '@agoric/internal/src/marshal.js';
import { E, Far } from '@endo/far';
import { Fail } from '@endo/errors';

export { boardSlottingMarshaller };

/** @type {(val: any) => string} */
export const boardValToSlot = val => {
  if ('getBoardId' in val) {
    return val.getBoardId();
  }
  throw Fail`unknown obj in boardSlottingMarshaller.valToSlot ${val}`;
};

/** @param {string} agoricNetSubdomain */
export const networkConfigUrl = agoricNetSubdomain =>
  `https://${agoricNetSubdomain}.agoric.net/network-config`;
/** @param {string} agoricNetSubdomain */
export const rpcUrl = agoricNetSubdomain =>
  `https://${agoricNetSubdomain}.rpc.agoric.net:443`;

/**
 * @typedef {{ rpcAddrs: string[], chainName: string, apiAddress: string }} MinimalNetworkConfig
 */

/** @type {MinimalNetworkConfig} */
const networkConfig = {
  rpcAddrs: ['http://0.0.0.0:26657'],
  chainName: 'agoriclocal',
  apiAddress: 'http://localhost:1317',
};
export { networkConfig };
// console.warn('networkConfig', networkConfig);

/**
 * gRPC-gateway REST API access
 *
 * @see {@link https://docs.cosmos.network/v0.45/core/grpc_rest.html#rest-server Cosmos SDK REST Server}
 *
 * Note: avoid Legacy REST routes, per
 * {@link https://docs.cosmos.network/v0.45/migrations/rest.html Cosmos SDK REST Endpoints Migration}.
 *
 * @param {string} apiAddress nodes default to port 1317
 * @param {object} io
 * @param {typeof fetch} io.fetch
 */
const makeAPI = (apiAddress, { fetch }) => {
  assert.typeof(apiAddress, 'string');

  /**
   * @param {string} href
   * @param {object} [options]
   * @param {Record<string, string>} [options.headers]
   */
  const getJSON = (href, options = {}) => {
    const opts = {
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };
    const url = `${apiAddress}${href}`;
    return fetch(url, opts).then(r => {
      if (!r.ok) throw Error(r.statusText);
      return r.json().then(data => {
        return data;
      });
    });
  };

  return Far('LCD', {
    getJSON,
    latestBlock: () => getJSON(`/cosmos/base/tendermint/v1beta1/blocks/latest`),
  });
};
/** @typedef {ReturnType<typeof makeAPI>} LCD */

/**
 * @template T
 * @param {(value: string) => T} f
 * @param {AsyncGenerator<string[], void, unknown>} chunks
 */
async function* mapHistory(f, chunks) {
  for await (const chunk of chunks) {
    if (chunk === undefined) continue;
    for (const value of chunk.reverse()) {
      yield f(value);
    }
  }
}

/**
 * @param {LCD} lcd
 */
export const makeVStorage = lcd => {
  const getJSON = (href, options) => E(lcd).getJSON(href, options);

  // height=0 is the same as omitting height and implies the highest block
  const href = (path = 'published', { kind = 'data' } = {}) =>
    `/agoric/vstorage/${kind}/${path}`;
  const headers = height =>
    height ? { 'x-cosmos-block-height': `${height}` } : undefined;

  const readStorage = (
    path = 'published',
    { kind = 'data', height = 0 } = {},
  ) =>
    getJSON(href(path, { kind }), { headers: headers(height) }).catch(err => {
      throw Error(`cannot read ${kind} of ${path}: ${err.message}`);
    });
  const readCell = (path, opts) =>
    readStorage(path, opts)
      .then(data => data.value)
      .then(s => (s === '' ? {} : JSON.parse(s)));

  /**
   * Read values going back as far as available
   *
   * @param {string} path
   * @param {number | string} [minHeight]
   */
  async function* readHistory(path, minHeight = undefined) {
    // undefined the first iteration, to query at the highest
    let blockHeight;
    await null;
    do {
      // console.debug('READING', { blockHeight });
      /** @type {string[]} */
      let values = [];
      try {
        ({ blockHeight, values } = await readCell(path, {
          kind: 'data',
          height: blockHeight && Number(blockHeight) - 1,
        }));
        // console.debug('readAt returned', { blockHeight });
      } catch (err) {
        if (err.message.match(/unknown request/)) {
          // XXX FIXME
          // console.error(err);
          break;
        }
        throw err;
      }
      yield values;
      // console.debug('PUSHED', values);
      // console.debug('NEW', { blockHeight, minHeight });
      if (minHeight && Number(blockHeight) <= Number(minHeight)) break;
    } while (blockHeight > 0);
  }

  /**
   * @template T
   * @param {(value: string) => T} f
   * @param {string} path
   * @param {number | string} [minHeight]
   */
  const readHistoryBy = (f, path, minHeight) =>
    mapHistory(f, readHistory(path, minHeight));

  return {
    lcd,
    readLatest: readStorage,
    readCell,
    readHistory,
    readHistoryBy,
  };
};
/** @typedef {ReturnType<typeof makeVStorage>} VStorage */

export const makeFromBoard = () => {
  const cache = new Map();
  /** @type {(boardId: string, iface?: string) => ReturnType<typeof makeBoardRemote>} */
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
  parseCapData: txt => {
    /** @type {{ value: string }} */
    const { value } = txt;
    assert(typeof value === 'string', typeof value);
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
  /** @type {Record<string, string>} */
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
          reverse[/** @type {string} */ (remote.getBoardId())] = name;
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
export const makeVstorageKit = async ({ fetch }, config = networkConfig) => {
  await null;
  try {
    const lcd = await makeAPI(networkConfig.apiAddress, { fetch });
    const vstorage = makeVStorage(lcd);

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
/** @typedef {Awaited<ReturnType<typeof makeVstorageKit>>} RpcUtils */
