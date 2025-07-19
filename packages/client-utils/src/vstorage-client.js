import { Fail, q as quote } from '@endo/errors';

/**
 * @param {object} powers
 * @param {typeof window.fetch} powers.fetch
 * @param {import('@agoric/client-utils/src/network-config').MinimalNetworkConfig} config
 */
export const makeVStorageClient = ({ fetch }, config) => {
  const rpcAddress = config.rpcAddrs.find(Boolean);

  rpcAddress || Fail`No valid RPC address found in config ${quote(config)}`;

  const vStorageClient = {};

  return vStorageClient;
};
