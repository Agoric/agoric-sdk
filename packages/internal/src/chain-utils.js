/**
 * @file Types and utilities for supporting blockchain functionality without
 *   risking import cycles.
 *
 *   TODO: Integrate (or integrate with) any/all of:
 *
 *   - ./action-types.js
 *   - ./chain-storage-paths.js
 *   - ./config.js
 *   - ../../cosmic-proto (if comfortable co-residing with generated code)
 */

import * as _ActionType from './action-types.js';

/** @typedef {`${bigint}`} NatString */

/**
 * @typedef {object} BlockInfo
 * @property {number} blockHeight
 * @property {number} blockTime POSIX Seconds Since the Epoch
 * @property {import('@agoric/cosmic-proto/swingset/swingset.js').ParamsSDKType} params
 */

/**
 * @typedef {BlockInfo & {
 *   type: typeof _ActionType.AG_COSMOS_INIT;
 *   chainID: string;
 *   isBootstrap?: boolean;
 *   supplyCoins: { denom: string; amount: NatString }[];
 * }} InitMsg
 *   cosmosInitAction fields that are subject to consensus. See cosmosInitAction
 *   in {@link ../../../golang/cosmos/app/app.go}.
 */

/**
 * @param {any} initAction
 * @returns {InitMsg}
 */
export const makeInitMsg = initAction => {
  const {
    type,
    blockHeight,
    blockTime,
    chainID,
    params,
    // NB: resolvedConfig is independent of consensus and MUST NOT be included
    supplyCoins,
  } = initAction;
  return {
    type,
    blockHeight,
    blockTime,
    chainID,
    params,
    supplyCoins,
  };
};
