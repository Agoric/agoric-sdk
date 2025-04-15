import {
  QueryChildrenRequest,
  QueryChildrenResponse,
  QueryDataRequest,
  QueryDataResponse,
} from '@agoric/cosmic-proto/agoric/vstorage/query.js';
import { decodeBase64 } from '@endo/base64';
import { encodeHex } from '@agoric/internal/src/hex.js';

/**
 * @import {AbciQueryResponse} from '@cosmjs/tendermint-rpc';
 * @import {JsonSafe} from '@agoric/cosmic-proto';
 * @import {MinimalNetworkConfig} from './network-config.js';
 */

const codecs = {
  children: {
    rpc: '/agoric.vstorage.Query/Children',
    request: QueryChildrenRequest,
    response: QueryChildrenResponse,
  },
  data: {
    rpc: '/agoric.vstorage.Query/Data',
    request: QueryDataRequest,
    response: QueryDataResponse,
  },
};

/** @typedef {(typeof codecs)[keyof typeof codecs]['response']} ResponseCodec */

/**
 * @param {object} powers
 * @param {typeof window.fetch} powers.fetch
 * @param {MinimalNetworkConfig} config
 */
export const makeVStorage = ({ fetch }, config) => {
  /**
   * @template {keyof codecs} T
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
   * @template {keyof codecs} T
   * @param {string} [path]
   * @param {object} [opts]
   * @param {T} [opts.kind]
   * @param {number | bigint} [opts.height] 0 is the same as omitting height and implies the highest block
   * @returns {`/abci_query?${string}`}
   */
  const makeAbciQuery = (
    path = 'published',
    { kind = /** @type {T} */ ('children'), height = 0 } = {},
  ) => {
    const codec = codecs[kind];
    if (!codec) {
      throw Error(`unknown rpc kind: ${kind}`);
    }

    const { rpc, request } = codec;
    const buf = request.toProto({ path });

    const hexData = encodeHex(buf);
    return `/abci_query?path=%22${rpc}%22&data=0x${hexData}&height=${height}`;
  };

  /**
   * @template {keyof codecs} T
   * @param {string} [path]
   * @param {object} [opts]
   * @param {T} [opts.kind]
   * @param {number | bigint} [opts.height] 0 is the same as omitting height and implies the highest block
   */
  const readStorage = (
    path = 'published',
    { kind = /** @type {T} */ ('children'), height = 0 } = {},
  ) =>
    getVstorageJson(path, { kind, height })
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

        const codec = codecs[kind];
        if (!codec) {
          throw Error(`unknown codec for kind: ${kind}`);
        }
        return { ...data, codec: codec.response };
      });

  const vstorage = {
    /** @deprecated use abstractions */
    url: makeAbciQuery,
    /**
     * @param {{ result: { response: JsonSafe<AbciQueryResponse>}, codec?: ResponseCodec }} param0
     */
    decode({ result: { response }, codec }) {
      const { code } = response;
      if (code !== 0) {
        throw response;
      }
      const { value: b64Value } = response;
      if (!codec) {
        return atob(b64Value);
      }
      return JSON.stringify(codec.decode(decodeBase64(b64Value)));
    },
    /**
     *
     * @param {string} path
     * @returns {Promise<string>} latest vstorage value at path
     */
    async readLatest(path = 'published') {
      const raw = await readStorage(path, { kind: 'data' });
      return vstorage.decode(raw);
    },
    async keys(path = 'published') {
      const raw = await readStorage(path, { kind: 'children' });
      return JSON.parse(vstorage.decode(raw)).children;
    },
    /**
     * @param {string} path
     * @param {number} [height] default is highest
     * @returns {Promise<{blockHeight: number, values: string[]}>}
     */
    async readAt(path, height = undefined) {
      const raw = await readStorage(path, { kind: 'data', height });
      const txt = vstorage.decode(raw);
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
          ({ blockHeight, values } = await vstorage.readAt(
            path,
            blockHeight && Number(blockHeight) - 1,
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
      } while (blockHeight > 0);
      return parts.flat();
    },
  };
  return vstorage;
};
/** @typedef {ReturnType<typeof makeVStorage>} VStorage */
