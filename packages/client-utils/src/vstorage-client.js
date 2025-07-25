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
const createError = (errorMessage, height, kind, path, rpcAddress) =>
  Error(
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
  const createVstorageAbciRoute = (height, kind, path) =>
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
    const route = createVstorageAbciRoute(height, kind, path);
    const rpcAddress = getRpcAddress();

    const url = rpcAddress + route;

    try {
      response = await fetch(url, { keepalive: true });
    } catch (err) {
      console.error(err);
      throw createError(err.message, height, kind, path, rpcAddress);
    }

    if (!response.ok)
      throw createError(await response.text(), height, kind, path, rpcAddress);

    const { result } = /** @type {AbciResponse} */ (await response.json());

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
   * @param {Height} [minimum]
   * @param {Height} [maximum]
   */
  async function* iterate(minimum, maximum) {
    /** @type {Array<Update<T>>} */
    let values = [];
    for await (const value of reverseIterate(maximum, minimum))
      values = [value, ...values];
    for (const value of values) yield value;
  }

  /**
   * @param {Height} [maximum]
   * @param {Height} [minimum]
   */
  async function* reverseIterate(maximum, minimum) {
    let blockHeight = maximum;
    /** @type {string | undefined} */
    let lastValue;

    await null;

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

      if (isStreamCell(parsedValue)) {
        // eslint-disable-next-line no-self-assign
        parsedValue = /** @type {StreamCell} */ (parsedValue);

        const currentBlockHeight = BigInt(parsedValue.blockHeight);
        blockHeight = currentBlockHeight - 1n;

        if ((minimum && currentBlockHeight < minimum) || !currentBlockHeight)
          break;

        yield* allValuesFromCell(currentBlockHeight, parsedValue.values);
      } else {
        // eslint-disable-next-line no-lonely-if
        if (!options?.compat)
          throw Error(`Expected a stream cell, got ${quote(parsedValue)}`);
        else {
          if (!blockHeight) blockHeight = await queryClient.getLatestHeight();

          if ((minimum && blockHeight < minimum) || !blockHeight) break;

          if (lastValue !== value)
            yield /** @type {Update<T>} */ ({ blockHeight, value });

          blockHeight -= 1n;
          lastValue = value;
        }
      }
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
 * @param {Partial<{ assertCell: boolean; assertDataString: boolean; }>} [options]
 * @returns {Topic<T>}
 */
const makeTopic = ({ queryClient }, path, options) => ({
  latest: async height => {
    if (height && height < 0)
      throw createError(
        `${INVALID_HEIGHT_ERROR_MESSAGE} ${height}`,
        height,
        PATHS.DATA,
        path,
      );

    const response = await queryClient.queryAbci(path, {
      height: height && height > 0n ? height - 1n : height,
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
        makeTopic({ queryClient }, path, { assertDataString: true })
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
    /**
     * @deprecated
     * @template {any} T
     * @param {string} path
     * @param {Height} height
     */
    readAt: (path, height) =>
      /** @type {Promise<StreamTopic<T>>} */ (fromText(path).latest(height)),
    /**
     * @deprecated
     * @template {any} T
     * @param {string} path
     * @param {Height} minimumHeight
     */
    readFully: async (path, minimumHeight) => {
      /** @type {Array<Update<T>>} */
      const values = [];
      for await (const value of /** @type {AsyncIterable<Update<T>>} */ (
        fromText(path).reverseIterate(undefined, minimumHeight)
      ))
        values.push(value);
      return values;
    },
    /**
     * @deprecated
     * @template {any} T
     * @param {string} path
     */
    readLatest: path => /** @type {Promise<T>} */ (fromText(path).latest()),
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
