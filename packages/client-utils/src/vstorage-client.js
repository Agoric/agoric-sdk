import {
  QueryChildrenRequest,
  QueryChildrenResponse,
  QueryDataRequest,
  QueryDataResponse,
} from '@agoric/cosmic-proto/agoric/vstorage/query.js';
import { encodeHex } from '@agoric/internal/src/hex.js';
import { decodeBase64 } from '@endo/base64';
import { Fail, makeError, q as quote } from '@endo/errors';

/**
 * @import {MinimalNetworkConfig} from '@agoric/client-utils/src/network-config';
 * @import {JsonSafe} from '@agoric/cosmic-proto';
 * @import {AbciQueryResponse} from '@cosmjs/tendermint-rpc';
 *
 * @typedef {bigint} Height;
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
 *  latest(height?: Height): Promise<T>;
 * }} Topic<T>
 */

/**
 * @template {any} T
 * @typedef {Topic<T> & {
 *  iterate(minimum?: Height, maximum?: Height): AsyncIterable<Update<T>>;
 *  reverseIterate(maximum?: Height, minimum?: Height): AsyncIterable<Update<T>>;
 * }} StreamTopic<T>
 */

/**
 * @template {any} T
 * @typedef {{
 *  blockHeight: Height;
 *  value: T;
 * }} Update<T>
 */

export const INVALID_HEIGHT_ERROR_MESSAGE = 'Invalid height';
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
 * @param {string} errorMessage
 * @param {Height} height
 * @param {PATHS[keyof PATHS]} kind
 * @param {string} path
 * @param {MinimalNetworkConfig['rpcAddrs'][0]} [rpcAddress]
 */
const makeVstorageError = (errorMessage, height, kind, path, rpcAddress) =>
  makeError(
    `Cannot read '${kind}' of '${path}' ${
      rpcAddress ? `from '${rpcAddress}'` : ''
    }  at height '${height}' due to error: ${errorMessage}`,
  );

/**
 * @param {ReturnType<parseValue>} cell
 */
const isDataString = cell => cell && typeof cell === 'string';

/**
 * @param {ReturnType<typeof parseValue>} cell
 */
const isStreamCell = cell =>
  !!cell &&
  typeof cell === 'object' &&
  Array.isArray(cell.values) &&
  typeof cell.blockHeight === 'string' &&
  /^0$|^[1-9][0-9]*$/.test(cell.blockHeight);

/**
 * @param {{fetch: typeof window.fetch}} powers
 * @param {MinimalNetworkConfig} config
 */
const makeQueryClient = ({ fetch }, config) => {
  if (!config.rpcAddrs.length)
    return Fail`${INVALID_RPC_ADDRESS_ERROR_MESSAGE} ${quote(config)}`;

  const getRpcAddress = makeRoundRobin(config.rpcAddrs);

  /**
   * @param {Height} height
   * @param {PATHS[keyof PATHS]} kind
   * @param {string} path
   */
  const computeVstorageAbciRoute = (height, kind, path) =>
    encodeURI(
      `/abci_query?data=0x${encodeHex(
        codecs[kind].request.toProto({ path }),
      )}&height=${height}&path="${PATH_PREFIX}/${kind}"`,
    );

  const getLatestHeight = async () => {
    await null;

    for (const rpcAddress of config.rpcAddrs) {
      /** @type {Response|undefined} */
      let response;
      try {
        response = await fetch(`${rpcAddress}/status`);
      } catch (err) {
        continue;
      }

      if (!response.ok) continue;
      const { result } = /** @type {NodeStatusResponse} */ (
        await response.json()
      );

      if (result.sync_info.catching_up) continue;

      return BigInt(result.sync_info.latest_block_height);
    }

    throw Error(
      `Couldn't get latest height from any of the rpcs in ${quote(config.rpcAddrs)}`,
    );
  };

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
  const queryAbci = async (
    path,
    { height = 0n, kind = PATHS.CHILDREN } = {},
  ) => {
    await null;

    const codec = codecs[kind];
    /** @type {Response|undefined} */
    let response;
    const route = computeVstorageAbciRoute(height, kind, path);
    const rpcAddress = getRpcAddress();

    const url = rpcAddress + route;

    try {
      response = await fetch(url, { keepalive: true });
    } catch (err) {
      console.error(err);
      throw makeVstorageError(err.message, height, kind, path, rpcAddress);
    }

    if (!response.ok)
      throw makeVstorageError(
        await response.text(),
        height,
        kind,
        path,
        rpcAddress,
      );

    const { result } = /** @type {AbciResponse} */ (await response.json());

    if (result.response?.code !== 0)
      throw makeVstorageError(
        `Error code '${result.response.code}', Error message: '${result.response.log}'`,
        height,
        kind,
        path,
        rpcAddress,
      );

    return codec.response.decode(decodeBase64(result.response.value));
  };

  return { getLatestHeight, queryAbci };
};

/**
 * @template {any} T
 * @param {Array<T>} values
 */
const makeRoundRobin = values => {
  let currentIndex = 0;

  return () => {
    const element = values[currentIndex];
    currentIndex = (currentIndex + 1) % values.length;
    return element;
  };
};

/**
 * @template {any} T
 * @param {{queryClient: ReturnType<typeof makeQueryClient>}} powers
 * @param {string} path
 * @param {Partial<{ compat: boolean }>} [options]
 * @returns {StreamTopic<T>}
 */
const makeStreamTopic = ({ queryClient }, path, options) => {
  /**
   * @param {Height} blockHeight
   * @param {StreamCell['values']} values
   */
  function* allValuesFromCell(blockHeight, values) {
    for (const value of values.reverse())
      yield /** @type {Update<T>} */ ({
        blockHeight,
        value: JSON.parse(value),
      });
  }

  /**
   * @param {boolean} compatMode
   * @param {ReturnType<typeof parseValue>} value
   */
  const assertValueStructure = (compatMode, value) => {
    if (!(isStreamCell(value) || compatMode))
      throw Error(`Expected a stream cell, got ${quote(value)}`);
  };

  /**
   * @param {Height} [minimum]
   * @param {Height} [maximum]
   */
  async function* iterate(minimum, maximum) {
    /** @type {Array<Update<T>>} */
    let values = [];

    for await (const value of reverseIterate(maximum, minimum, true))
      values = [value, ...values];

    for (const value of values) {
      assertValueStructure(!!options?.compat, {
        blockHeight: String(value.blockHeight),
        values: [/** @type string */ (value.value)],
      });
      yield value;
    }
  }

  /**
   * @param {Height} [maximum]
   * @param {Height} [minimum]
   * @param {boolean} [compatMode]
   */
  async function* reverseIterate(
    maximum,
    minimum,
    compatMode = options?.compat,
  ) {
    let blockHeight = maximum;
    /** @type {Height} */
    let currentBlockHeight;
    /** @type {string | undefined} */
    let lastValue;

    await null;

    if (!minimum || minimum < MINIMUM_HEIGHT) minimum = MINIMUM_HEIGHT;

    if (maximum && maximum < minimum)
      throw makeVstorageError(
        `${INVALID_HEIGHT_ERROR_MESSAGE} ${maximum}`,
        blockHeight || (await queryClient.getLatestHeight()),
        PATHS.DATA,
        path,
      );

    while (true) {
      /** @type {string | undefined} */
      let value;

      try {
        ({ value } = await queryClient.queryAbci(path, {
          height: blockHeight,
          kind: PATHS.DATA,
        }));
      } catch (err) {
        console.error(err);
        break;
      }

      if (!value) break;

      let parsedValue = parseValue(value);
      assertValueStructure(!!compatMode, parsedValue);

      if (isStreamCell(parsedValue)) {
        // eslint-disable-next-line no-self-assign
        parsedValue = /** @type {StreamCell} */ (parsedValue);

        currentBlockHeight = BigInt(parsedValue.blockHeight);

        if (!minimum || currentBlockHeight >= minimum)
          yield* allValuesFromCell(currentBlockHeight, parsedValue.values);
      } else {
        if (blockHeight === undefined)
          blockHeight = await queryClient.getLatestHeight();
        currentBlockHeight = blockHeight;

        if (lastValue !== value && (!minimum || currentBlockHeight >= minimum))
          yield /** @type {Update<T>} */ ({ blockHeight, value });

        lastValue = value;
      }

      if ((minimum && currentBlockHeight <= minimum) || !currentBlockHeight)
        break;
      blockHeight = currentBlockHeight - 1n;
    }
  }

  return {
    ...makeTopic({ queryClient }, path, { assertCell: !options?.compat }),
    iterate,
    reverseIterate,
  };
};

/**
 * @template {any} T
 * @param {{queryClient: ReturnType<typeof makeQueryClient>}} powers
 * @param {string} path
 * @param {Partial<{ assertCell: boolean; assertDataString: boolean; fetchDataAtPreviousHeight: boolean; }>} [options]
 * @returns {Topic<T>}
 */
const makeTopic = ({ queryClient }, path, options) => ({
  latest: async height => {
    if (height && height < MINIMUM_HEIGHT)
      throw makeVstorageError(
        `${INVALID_HEIGHT_ERROR_MESSAGE} ${height}`,
        height,
        PATHS.DATA,
        path,
      );

    const response = await queryClient.queryAbci(path, {
      height:
        height && height > MINIMUM_HEIGHT && options?.fetchDataAtPreviousHeight
          ? height - 1n
          : height,
      kind: PATHS.DATA,
    });
    const parsedValue = parseValue(response.value);

    if (options?.assertCell && !isStreamCell(parsedValue))
      throw Error(`Expected a stream cell, got ${quote(parsedValue)}`);
    else if (options?.assertDataString && !isDataString(parsedValue))
      throw Error(`Expected a data string, got ${quote(parsedValue)}`);

    return /** @type {T} */ (parsedValue);
  },
});

/**
 * @param {{fetch: typeof window.fetch}} powers
 * @param {MinimalNetworkConfig} config
 */
export const makeVStorageClient = ({ fetch }, config) => {
  if (!config.rpcAddrs.length)
    return Fail`${INVALID_RPC_ADDRESS_ERROR_MESSAGE} ${quote(config)}`;

  const queryClient = makeQueryClient({ fetch }, config);

  /**
   * @template {any} T
   * @param {string} path
   * @param {Partial<{ compat: boolean }>} [options]
   */
  const fromText = (path, options) =>
    /** @type {StreamTopic<T>} */ (
      makeStreamTopic({ queryClient }, path, options)
    );

  const vStorageClient = {
    fromText,
    /**
     * @param {string} path
     */
    fromTextBlock: path =>
      /** @type {Topic<string>} */ (
        makeTopic({ queryClient }, path, {
          assertDataString: true,
          fetchDataAtPreviousHeight: true,
        })
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
 * @returns {StreamCell | string}
 */
const parseValue = value => {
  try {
    const parsedValue = JSON.parse(value);
    if (isStreamCell(parsedValue)) return parsedValue;
    else return value;
  } catch {
    return value;
  }
};
