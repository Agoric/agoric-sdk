import {
  QueryChildrenRequest,
  QueryChildrenResponse,
  QueryDataRequest,
  QueryDataResponse,
} from '@agoric/cosmic-proto/agoric/vstorage/query.js';
import { encodeHex } from '@agoric/internal/src/hex.js';
import { decodeBase64 } from '@endo/base64';
import { Fail, q as quote } from '@endo/errors';

/**
 * @import {MinimalNetworkConfig} from '@agoric/client-utils/src/network-config';
 * @import {JsonSafe} from '@agoric/cosmic-proto';
 * @import {AbciQueryResponse} from '@cosmjs/tendermint-rpc';
 *
 * @typedef {bigint} Height;
 * @typedef {{
 *  id: number;
 *  jsonrpc: string;
 *  result: {
 *    response: JsonSafe<AbciQueryResponse>;
 *  }
 * }} JsonRpcResponse;
 */

export const INVALID_RPC_ADDRESS_ERROR_MESSAGE =
  'No valid RPC address found in config';

export const PATH_PREFIX = '/agoric.vstorage.Query';

export const PATHS = /** @type {const} */ ({
  CHILDREN: 'Children',
  DATA: 'Data',
});

const codecs = /** @type {const} */ ({
  [PATHS.CHILDREN]: {
    request: QueryChildrenRequest,
    response: QueryChildrenResponse,
  },
  [PATHS.DATA]: {
    request: QueryDataRequest,
    response: QueryDataResponse,
  },
});

/**
 * @param {{fetch: typeof window.fetch}} powers
 * @param {MinimalNetworkConfig} config
 */
const makeAbciQueryClient = ({ fetch }, config) => {
  /**
   * @param {Height} height
   * @param {PATHS[keyof PATHS]} kind
   * @param {string} path
   */
  const createRoute = (height, kind, path) =>
    encodeURI(
      `/abci_query?data=0x${encodeHex(
        codecs[kind].request.toProto({ path }),
      )}&height=${height}&path="${PATH_PREFIX}/${kind}"`,
    );

  /**
   * @param {string} errorMessage
   * @param {Height} height
   * @param {PATHS[keyof PATHS]} kind
   * @param {string} path
   * @param {MinimalNetworkConfig['rpcAddrs'][0]} rpcAddress
   */
  const createError = (errorMessage, height, kind, path, rpcAddress) =>
    Error(
      `Cannot read '${kind}' of '${path}' from '${rpcAddress}' at height '${height}' due to error: ${errorMessage}`,
    );

  /**
   * @overload
   * @param {string} path
   * @param {Partial<{ height: Height; kind: PATHS['CHILDREN'] }>} opts
   * @returns {Promise<QueryChildrenResponse>}
   *
   * @overload
   * @param {string} path
   * @param {Partial<{ height: Height; kind: PATHS['DATA'] }>} opts
   * @returns {Promise<QueryDataResponse>}
   */
  /**
   * @param {string} path
   * @param {Partial<{ height: Height; kind: PATHS['CHILDREN'] | PATHS['DATA'] }>} [opts]
   * @returns {Promise<QueryChildrenResponse | QueryDataResponse>}
   */
  const query = async (path, { height = 0n, kind = PATHS.CHILDREN } = {}) => {
    await null;

    const rpcAddress = config.rpcAddrs.find(Boolean);

    if (!rpcAddress)
      return Fail`${INVALID_RPC_ADDRESS_ERROR_MESSAGE} ${quote(config)}`;

    const codec = codecs[kind];
    /** @type {Response|undefined} */
    let response;
    const route = createRoute(height, kind, path);
    const url = rpcAddress + route;

    try {
      response = await fetch(url, { keepalive: true });
    } catch (err) {
      console.error(err);
      throw createError(err.message, height, kind, path, rpcAddress);
    }

    if (!response.ok)
      throw createError(await response.text(), height, kind, path, rpcAddress);

    const { result } = /** @type {JsonRpcResponse} */ (await response.json());

    if (result.response?.code !== 0)
      throw createError(
        `Error code '${result.response.code}', Error message: '${result.response.log}'`,
        height,
        kind,
        path,
        rpcAddress,
      );

    return codec.response.decode(decodeBase64(result.response.value));
  };

  return { query };
};

/**
 * @param {{fetch: typeof window.fetch}} powers
 * @param {MinimalNetworkConfig} config
 */
export const makeVStorageClient = ({ fetch }, config) => {
  const rpcAddress = config.rpcAddrs.find(Boolean);

  if (!rpcAddress)
    return Fail`${INVALID_RPC_ADDRESS_ERROR_MESSAGE} ${quote(config)}`;

  const queryClient = makeAbciQueryClient({ fetch }, config);

  const vStorageClient = {
    /**
     * @param {string} path
     */
    keys: async path => {
      const response = await queryClient.query(path, { kind: PATHS.CHILDREN });
      return response.children;
    },
  };

  return vStorageClient;
};
