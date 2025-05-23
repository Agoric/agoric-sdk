import {
  QueryChildrenRequest,
  QueryChildrenResponse,
  QueryDataRequest,
  QueryDataResponse,
} from '@agoric/cosmic-proto/agoric/vstorage/query.js';
import { mustMatch } from '@agoric/internal';
import { encodeHex } from '@agoric/internal/src/hex.js';
import { StreamCellShape } from '@agoric/internal/src/lib-chainStorage.js';
import { Tendermint34Client } from '@cosmjs/tendermint-rpc';
import { decodeBase64 } from '@endo/base64';
import { makeTendermintRpcClient } from '@agoric/casting';
import { pickEndpoint } from './rpc.js';

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

// XXX more of a cosmic-proto concern but the Telescope codegen clients
// don't support specifying height
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
 * @deprecated use Tendermint34Client or similar
 *
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
  const rpcClient = makeTendermintRpcClient(pickEndpoint(config), fetch);
  const tmClientP = Tendermint34Client.create(rpcClient);

  /**
   * @template {'data' | 'children'} T
   * @param {string} vstoragePath
   * @param {object} [opts]
   * @param {T} [opts.kind]
   * @param {number | bigint} [opts.height] 0 is the same as omitting height and implies the highest block
   * @returns {Promise<AbciQueryResponse>}
   */
  const getVstorageJson = async (
    vstoragePath,
    { kind = /** @type {T} */ ('children'), height = 0 } = {},
  ) => {
    const tmClient = await tmClientP;
    const path = kindToRpc[kind];
    const data = codecs[path].request.toProto({ path: vstoragePath });
    return tmClient.abciQuery({ path, data, height: Number(height) });
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

    const codec = codecs[kindToRpc[kind]];

    /** @type {AbciQueryResponse} */
    let data;
    try {
      data = await getVstorageJson(path, { kind, height });
    } catch (err) {
      throw Error(`cannot read ${kind} of ${path}: ${err.message}`);
    }

    const { value: b64Value } = data;
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
     * @returns {Promise<StreamCell<unknown>>}
     */
    async readAt(path, height = undefined) {
      const response = await readStorage(path, { kind: 'data', height });
      /** @type {unknown} */
      const cell = harden(JSON.parse(response.value));
      mustMatch(cell, StreamCellShape);
      return cell;
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
        parts.push(values);
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
