/**
 * @import {MinimalNetworkConfig} from './network-config.js';
 */

import { createRPCQueryClient } from './codegen/agoric/rpc.query.js';
import { pickEndpoint } from './rpc.js';

/**
 * @typedef {Awaited<ReturnType<typeof createRPCQueryClient>>} AgoricQueryClient
 */

/**
 * @param {MinimalNetworkConfig} config
 * @returns {Promise<AgoricQueryClient>}
 */
export const makeAgoricQueryClient = config =>
  createRPCQueryClient({
    rpcEndpoint: pickEndpoint(config),
  });
