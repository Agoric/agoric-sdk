import {
  QueryChildrenRequest,
  QueryChildrenResponse,
  QueryDataRequest,
  QueryDataResponse,
} from '@agoric/cosmic-proto/agoric/vstorage/query.js';
import { encodeHex } from '@agoric/internal/src/hex.js';
import { isStreamCell } from '@agoric/internal/src/lib-chainStorage.js';
import { decodeBase64 } from '@endo/base64';
import { Fail, makeError, q as quote } from '@endo/errors';

/**
 * @import {MinimalNetworkConfig} from '@agoric/client-utils/src/network-config';
 * @import {JsonSafe} from '@agoric/cosmic-proto';
 * @import {AbciQueryResponse} from '@cosmjs/tendermint-rpc';
 *
 * @typedef {bigint} BlockHeight;
 *
 * @typedef {JsonRpcResponse<{response: AbciQueryResponse}>} AbciResponse;
 *
 * @typedef {JsonRpcResponse<{
 *  sync_info: {
 *    catching_up: boolean;
 *    latest_block_height: string;
 *  }
 * }>} NodeStatusResponse;
 *
 *
 * @typedef {{
 *  blockHeight: string;
 *  values: Array<string>;
 * }} StreamCell
 */

/**
 * @template {any} T
 * @typedef {{
 *  id: number;
 *  jsonrpc: string;
 *  result: JsonSafe<T>
 * }} JsonRpcResponse;
 */

/**
 * @template {any} T
 * @typedef {{
 *  latest(blockHeight?: BlockHeight): Promise<Update<T>>;
 * }} Topic<T>
 */

/**
 * @template {any} T
 * @typedef {Topic<T> & {
 *  iterate(minimum?: BlockHeight, maximum?: BlockHeight): AsyncIterable<Update<T>>;
 *  reverseIterate(maximum?: BlockHeight, minimum?: BlockHeight): AsyncIterable<Update<T>>;
 * }} StreamTopic<T>
 */

/**
 * @template {any} T
 * @typedef {{
 *  blockHeight: BlockHeight;
 *  value: T;
 * }} Update<T>
 */

export const INVALID_HEIGHT_ERROR_MESSAGE = 'Invalid block height';
export const INVALID_RPC_ADDRESS_ERROR_MESSAGE =
  'No valid RPC address found in config';

const MINIMUM_HEIGHT = 1n;

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
 * @param {ReturnType<typeof parseValue>} value
 */
const assertValueStructure = value => {
  if (!isStreamCell(value))
    throw Error(`Expected a stream cell, got ${quote(value)}`);
};

/**
 * @param {ReturnType<parseValue>} cell
 */
const isDataString = cell => !!cell && typeof cell === 'string';

/**
 * @param {{
 *  errorMessage: string;
 *  blockHeight?: BlockHeight;
 *  kind: PATHS[keyof PATHS];
 *  path: string;
 *  rpcAddress?: MinimalNetworkConfig['rpcAddrs'][0];
 * }} options
 */
const makeVstorageError = ({
  errorMessage,
  blockHeight,
  kind,
  path,
  rpcAddress,
}) =>
  makeError(
    `Cannot read '${kind}' of '${path}' ${
      rpcAddress ? `from '${rpcAddress}'` : ''
    } ${
      blockHeight ? `at block height '${blockHeight}'` : ''
    } due to error: ${errorMessage}`,
  );

/**
 * @template {any} T
 * @param {{queryClient: ReturnType<typeof makeQueryClient>}} powers
 * @param {string} path
 * @param {Partial<{ compat: boolean }>} [options]
 * @returns {Topic<T>}
 */
const makeBlockTopic = ({ queryClient }, path, options) => ({
  latest: async blockHeight => {
    if (blockHeight && blockHeight < MINIMUM_HEIGHT)
      throw makeVstorageError({
        errorMessage: INVALID_HEIGHT_ERROR_MESSAGE,
        blockHeight,
        kind: PATHS.DATA,
        path,
      });

    const response = await queryClient.queryAbci(path, {
      blockHeight:
        blockHeight && blockHeight > MINIMUM_HEIGHT
          ? blockHeight - 1n
          : blockHeight,
      kind: PATHS.DATA,
    });
    const parsedValue = parseValue(response.value);

    if (isDataString(parsedValue))
      return /** @type {Update<T>} */ ({
        blockHeight,
        value: parsedValue,
      });

    if (options?.compat) {
      assertValueStructure(parsedValue);
      const data = /** @type {StreamCell} */ (parsedValue);
      return /** @type {Update<T>} */ ({
        blockHeight: BigInt(data.blockHeight),
        value: data.values.reverse().find(Boolean),
      });
    }

    throw Error(`Expected a data cell, got ${quote(parsedValue)}`);
  },
});

/**
 * @param {{fetch: typeof window.fetch}} powers
 * @param {MinimalNetworkConfig} config
 */
const makeQueryClient = ({ fetch }, config) => {
  if (!config.rpcAddrs.length)
    return Fail`${INVALID_RPC_ADDRESS_ERROR_MESSAGE} ${quote(config)}`;

  /**
   * @param {BlockHeight} blockHeight
   * @param {PATHS[keyof PATHS]} kind
   * @param {string} path
   */
  const computeVstorageAbciRoute = (blockHeight, kind, path) =>
    encodeURI(
      `/abci_query?data=0x${encodeHex(
        codecs[kind].request.toProto({ path }),
      )}&height=${blockHeight}&path="${PATH_PREFIX}/${kind}"`,
    );

  /**
   * @overload
   * @param {string} path
   * @param {Partial<{ blockHeight: BlockHeight; kind: PATHS['CHILDREN'] }>} opts
   * @returns {Promise<QueryChildrenResponse>}
   *
   * @overload
   * @param {string} path
   * @param {Partial<{ blockHeight: BlockHeight; kind: PATHS['DATA'] }>} opts
   * @returns {Promise<QueryDataResponse>}
   */
  /**
   * @param {string} path
   * @param {Partial<{ blockHeight: BlockHeight; kind: PATHS['CHILDREN'] | PATHS['DATA'] }>} [opts]
   * @returns {Promise<QueryChildrenResponse | QueryDataResponse>}
   */
  const queryAbci = async (
    path,
    { blockHeight = 0n, kind = PATHS.CHILDREN } = {},
  ) => {
    await null;

    const codec = codecs[kind];
    /** @type {Response|undefined} */
    let response;
    const route = computeVstorageAbciRoute(blockHeight, kind, path);
    // TODO: implement some sort of load distribution
    // mechanism to smartly choose an rpc address
    const rpcAddress = config.rpcAddrs.find(Boolean);

    const url = rpcAddress + route;

    try {
      response = await fetch(url, { keepalive: true });
    } catch (err) {
      console.error(err);
      throw makeVstorageError({
        errorMessage: err.message,
        blockHeight,
        kind,
        path,
        rpcAddress,
      });
    }

    if (!response.ok)
      throw makeVstorageError({
        errorMessage: await response.text(),
        blockHeight,
        kind,
        path,
        rpcAddress,
      });

    const { result } = /** @type {AbciResponse} */ (await response.json());

    if (result.response?.code !== 0)
      throw makeVstorageError({
        errorMessage: `Error code '${result.response.code}', Error message: '${result.response.log}'`,
        blockHeight,
        kind,
        path,
        rpcAddress,
      });

    return codec.response.decode(decodeBase64(result.response.value));
  };

  return { queryAbci };
};

/**
 * @template {any} T
 * @param {{queryClient: ReturnType<typeof makeQueryClient>}} powers
 * @param {string} path
 * @returns {StreamTopic<T>}
 */
const makeStreamTopic = ({ queryClient }, path) => {
  /**
   * @param {BlockHeight} blockHeight
   * @param {StreamCell['values']} values
   */
  function* allUpdatesFromCell(blockHeight, values) {
    for (const value of values)
      yield /** @type {Update<T>} */ ({
        blockHeight,
        value,
      });
  }

  /**
   * @param {BlockHeight} [minimum]
   * @param {BlockHeight} [maximum]
   */
  async function* iterate(minimum, maximum) {
    /** @type {Array<Update<T>>} */
    let values = [];

    for await (const value of reverseIterate(maximum, minimum))
      values = [value, ...values];

    for (const value of values) yield value;
  }

  /**
   * @param {BlockHeight} blockHeight
   */
  const latest = async blockHeight => {
    if (blockHeight && blockHeight < MINIMUM_HEIGHT)
      throw makeVstorageError({
        errorMessage: `${INVALID_HEIGHT_ERROR_MESSAGE} (less than minimum height ${MINIMUM_HEIGHT})`,
        blockHeight,
        kind: PATHS.DATA,
        path,
      });

    const response = await queryClient.queryAbci(path, {
      blockHeight,
      kind: PATHS.DATA,
    });

    const parsedValue = /** @type {StreamCell} */ (parseValue(response.value));
    assertValueStructure(parsedValue);

    return /** @type {Update<T>} */ ({
      blockHeight: BigInt(parsedValue.blockHeight),
      value: parsedValue.values.reverse().find(Boolean),
    });
  };

  /**
   * @param {BlockHeight} [maximum]
   * @param {BlockHeight} [minimum]
   */
  async function* reverseIterate(maximum, minimum) {
    let blockHeight = maximum;

    await null;

    if (!minimum || minimum < MINIMUM_HEIGHT) minimum = MINIMUM_HEIGHT;

    if (maximum && maximum < minimum)
      throw makeVstorageError({
        errorMessage: `${INVALID_HEIGHT_ERROR_MESSAGE} (requested maximum height ${maximum} is less than requested minimum height ${minimum})`,
        blockHeight,
        kind: PATHS.DATA,
        path,
      });

    while (true) {
      /** @type {string | undefined} */
      let value;

      try {
        ({ value } = await queryClient.queryAbci(path, {
          blockHeight,
          kind: PATHS.DATA,
        }));
      } catch (err) {
        console.error(err);
        break;
      }

      if (!value) break;

      const parsedValue = /** @type {StreamCell} */ (parseValue(value));
      assertValueStructure(parsedValue);

      const currentBlockHeight = BigInt(parsedValue.blockHeight);

      if (currentBlockHeight >= minimum)
        yield* allUpdatesFromCell(
          currentBlockHeight,
          parsedValue.values.reverse(),
        );

      if (currentBlockHeight <= minimum) break;

      blockHeight = currentBlockHeight - 1n;
    }
  }

  return {
    iterate,
    latest,
    reverseIterate,
  };
};

/**
 * @param {{fetch: typeof window.fetch}} powers
 * @param {MinimalNetworkConfig} config
 */
export const makeVStorageClient = ({ fetch }, config) => {
  if (!config.rpcAddrs.length)
    return Fail`${INVALID_RPC_ADDRESS_ERROR_MESSAGE} ${quote(config)}`;

  const queryClient = makeQueryClient({ fetch }, config);

  const vStorageClient = {
    /**
     * @template {any} T
     * @param {string} path
     */
    fromText: path =>
      /** @type {StreamTopic<T>} */ (makeStreamTopic({ queryClient }, path)),
    /**
     * @param {string} path
     * @param {Partial<{ compat: boolean }>} [options]
     */
    fromTextBlock: (path, options) =>
      /** @type {Topic<string>} */ (
        makeBlockTopic({ queryClient }, path, options)
      ),
    /**
     * @param {string} path
     */
    keys: async path => {
      const response = await queryClient.queryAbci(path, {
        kind: PATHS.CHILDREN,
      });
      return response.children;
    },
  };

  return vStorageClient;
};

/**
 * @param {string} value
 */
const parseValue = value => {
  try {
    const parsedValue = JSON.parse(value);
    if (isStreamCell(parsedValue))
      return /** @type {StreamCell} */ (parsedValue);
    // eslint-disable-next-line no-empty
  } catch {}

  return value;
};
