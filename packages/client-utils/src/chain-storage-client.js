import { makeVStorage } from './vstorage.js';

/**
 * @import {StreamCell} from '@agoric/internal/src/lib-chainStorage.js';
 * @import {MinimalNetworkConfig} from './network-config.js';
 */

/**
 * @param {{ fetch: typeof window.fetch }} io
 * @param {MinimalNetworkConfig} config
 */
export const makeChainStorageClient = ({ fetch }, config) => {
  const vstorage = makeVStorage({ fetch }, config);

  /**
   * @template T
   * @param {string} path
   * @param {number} [height] default is highest
   * @returns {Promise<StreamCell<T>>}
   */
  const readCell = async (path, height = undefined) => {
    const stringCell = await vstorage.readAt(path, height);
    return {
      blockHeight: stringCell.blockHeight,
      values: stringCell.values.map(s => JSON.parse(s)),
    };
  };

  return {
    vstorage,
    readCell,
  };
};
/** @typedef {ReturnType<typeof makeChainStorageClient>} ChainStorageClient */
