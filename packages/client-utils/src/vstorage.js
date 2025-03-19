import {
  QueryChildrenRequest,
  QueryChildrenResponse,
  QueryDataRequest,
  QueryDataResponse,
} from '@agoric/cosmic-proto/agoric/vstorage/query.js';
import { decodeBase64 } from '@endo/base64';

/**
 * @import {MinimalNetworkConfig} from './network-config.js';
 */

/**
 * @typedef {typeof QueryChildrenResponse | typeof QueryDataResponse} ResponseCodec
 */

/**
 * @typedef {'children' | 'data'} VStorageOpKind
 */

/**
 * @param {object} powers
 * @param {typeof window.fetch} powers.fetch
 * @param {MinimalNetworkConfig} config
 */
export const makeVStorage = ({ fetch }, config) => {
  /**
   * Convert an Uint8Array to a hex string, as per:
   * https://stackoverflow.com/a/75259983
   *
   * @param {Uint8Array} buf
   * @returns {string}
   */
  const toHex = buf =>
    Array.from(buf)
      .map(i => i.toString(16).padStart(2, '0'))
      .join('');

  /**
   * @param {string} path
   */
  const getJSON = async path => {
    const url = config.rpcAddrs[0] + path;
    // console.warn('fetching', url);
    const res = await fetch(url, { keepalive: true });
    return res.json();
  };
  /**
   * @param {string} [path]
   * @param {object} [opts]
   * @param {VStorageOpKind} [opts.kind]
   * @param {number | bigint} [opts.height] 0 is the same as omitting height and implies the highest block
   */
  const url = (path = 'published', { kind = 'children', height = 0 } = {}) => {
    let buf;
    let abciPath;
    switch (kind) {
      case 'children': {
        abciPath = '/agoric.vstorage.Query/Children';
        buf = QueryChildrenRequest.toProto({ path });
        break;
      }
      case 'data': {
        abciPath = '/agoric.vstorage.Query/Data';
        buf = QueryDataRequest.toProto({ path });
        break;
      }
      default: {
        throw Error(`unknown kind: ${kind}`);
      }
    }

    const hexData = toHex(buf);
    return `/abci_query?path=%22${abciPath}%22&data=0x${hexData}&height=${height}`;
  };

  /**
   *
   * @param {string} [path]
   * @param {object} [opts]
   * @param {VStorageOpKind} [opts.kind]
   * @param {number | bigint} [opts.height] 0 is the same as omitting height and implies the highest block
   * @returns
   */
  const readStorage = (
    path = 'published',
    { kind = 'children', height = 0 } = {},
  ) =>
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
        switch (kind) {
          case 'children': {
            return { ...data, codec: QueryChildrenResponse };
          }
          case 'data': {
            return { ...data, codec: QueryDataResponse };
          }
          default: {
            throw Error(`unknown kind: ${kind}`);
          }
        }
      });

  const vstorage = {
    url,
    /**
     * @param {{ result: { response: { value: string, code: number } }, codec?: ResponseCodec }} param0
     * @returns
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
