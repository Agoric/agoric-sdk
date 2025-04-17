import { decodeBase64 } from '@endo/base64';
import { encodeHex } from '@agoric/internal/src/hex.js';
import { StreamCellShape } from '@agoric/internal/src/lib-chainStorage.js';
import { mustMatch } from '@agoric/internal';
import {
  QueryChildrenRequest,
  QueryChildrenResponse,
  QueryDataRequest,
  QueryDataResponse,
} from '@agoric/cosmic-proto/agoric/vstorage/query.js';

/**
 * @import {AbciQueryResponse} from '@cosmjs/tendermint-rpc';
 * @import {JsonSafe} from '@agoric/cosmic-proto';
 * @import {StreamCell} from '@agoric/internal/src/lib-chainStorage.js';
 * @import {MinimalNetworkConfig} from './network-config.js';
 */

const kindToRpc = /** @type {const} */ ({
  __proto__: null,
  children: '/agoric.vstorage.Query/Children',
  data: '/agoric.vstorage.Query/Data',
});

// TODO move down to cosmic-proto, probably generated with Telescope
const codecs = {
  __proto__: null,
  '/agoric.vstorage.Query/Children': {
    request: QueryChildrenRequest,
    response: QueryChildrenResponse,
  },
  '/agoric.vstorage.Query/Data': {
    request: QueryDataRequest,
    response: QueryDataResponse,
  },
};

/**
 * @param specimen
 * @returns {StreamCell<string>}
 */
const coerceStringStreamCell = specimen => {
  mustMatch(specimen, StreamCellShape);
  if (!specimen.values.every(v => typeof v === 'string')) {
    throw Error('non-string value in specimen');
  }
  return /** @type {StreamCell<string>} */ (specimen);
};

/**
 * @template {'data' | 'children'} T
 * @param {string} [path]
 * @param {object} [opts]
 * @param {T} [opts.kind]
 * @param {number | bigint} [opts.height] 0 is the same as omitting height and implies the highest block
 * @returns {`/abci_query?${string}`}
 */
export const makeAbciQuery = (
  path = 'published',
  { kind = /** @type {T} */ ('children'), height = 0 } = {},
) => {
  const rpc = kindToRpc[kind];
  const { request } = codecs[rpc];
  const buf = request.toProto({ path });

  const hexData = encodeHex(buf);
  return `/abci_query?path=%22${rpc}%22&data=0x${hexData}&height=${height}`;
};

/**
 * @param {object} powers
 * @param {typeof window.fetch} powers.fetch
 * @param {MinimalNetworkConfig} config
 */
export const makeVStorage = ({ fetch }, config) => {
  /**
   * @template {'data' | 'children'} T
   * @param {string} vstoragePath
   * @param {object} [opts]
   * @param {T} [opts.kind]
   * @param {number | bigint} [opts.height] 0 is the same as omitting height and implies the highest block
   * @returns {Promise<{result: {response: JsonSafe<AbciQueryResponse>}}>}
   */
  const getVstorageJson = async (
    vstoragePath,
    { kind = /** @type {T} */ ('children'), height = 0 } = {},
  ) => {
    const url =
      config.rpcAddrs[0] + makeAbciQuery(vstoragePath, { kind, height });
    const res = await fetch(url, { keepalive: true });
    return res.json();
  };

  /**
   * @template {'children' | 'data'} T
   * @param {string} [path]
   * @param {object} [opts]
   * @param {T} [opts.kind]
   * @param {number | bigint} [opts.height] 0 is the same as omitting height and implies the highest block
   * @returns {Promise<T extends 'children' ? QueryChildrenResponse :QueryDataResponse >}
   */
  const readStorage = async (
    path = 'published',
    { kind = /** @type {T} */ ('children'), height = 0 } = {},
  ) => {
    await null;

    const rpc = kindToRpc[kind];
    const codec = codecs[rpc];

    /** @type {Awaited<ReturnType<typeof getVstorageJson>>} */
    let data;
    try {
      data = await getVstorageJson(path, { kind, height });
    } catch (err) {
      throw Error(`cannot read ${kind} of ${path}: ${err.message}`);
    }

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

    const { value: b64Value } = response;
    // @ts-expect-error cast
    return codec.response.decode(decodeBase64(b64Value));
  };

  const vstorage = {
    readStorage,
    /**
     *
     * @param {string} path
     * @returns {Promise<QueryDataResponse>} latest vstorage value at path
     */
    async readLatest(path = 'published') {
      return readStorage(path, { kind: 'data' });
    },
    /**
     * Keys of children at the path
     *
     * @param {string} path
     * @returns {Promise<string[]>}
     */
    async keys(path = 'published') {
      const response = await readStorage(path, { kind: 'children' });
      return response.children;
    },
    /**
     * @param {string} path
     * @param {number} [height] default is highest
     * @returns {Promise<StreamCell<string>>}
     */
    async readAt(path, height = undefined) {
      const response = await readStorage(path, { kind: 'data', height });
      /** @type {unknown} */
      const cell = harden(JSON.parse(response.value));
      return coerceStringStreamCell(cell);
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
      /** @type {string | undefined} */
      let blockHeight;
      await null;
      do {
        // console.debug('READING', { blockHeight });
        let values;
        try {
          ({ blockHeight, values } = await vstorage.readAt(
            path,
            blockHeight === undefined ? undefined : Number(blockHeight) - 1,
          ));
          // console.debug('readAt returned', { blockHeight });
        } catch (err) {
          if (
            // CosmosSDK ErrInvalidRequest with particular message text;
            // misrepresentation of pruned data
            // TODO replace after incorporating a fix to
            // https://github.com/cosmos/cosmos-sdk/issues/19992
            err.codespace === 'sdk' &&
            err.code === 18 &&
            err.message.match(/pruned/)
          ) {
            // console.error(err);
            break;
          }
          throw err;
        }
        parts.push(values.reverse());
        // console.debug('PUSHED', values);
        // console.debug('NEW', { blockHeight, minHeight });
        if (minHeight && Number(blockHeight) <= Number(minHeight)) break;
      } while (Number(blockHeight) > 0);
      return /** @type {string[]} */ (parts.flat());
    },
  };
  return vstorage;
};
/** @typedef {ReturnType<typeof makeVStorage>} VStorage */
