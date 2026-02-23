/* global globalThis */
/**
 * @file Reusable wallet utilities for portfolio contract testing and operations
 *
 * This module consolidates wallet-related utilities that were previously
 * duplicated across multichain-testing and a3p-integration.
 */

import { CONTRACT_CONTROL_WALLET_KEY } from './control/wallet-constants.js';

/**
 * @import {Instance} from '@agoric/zoe';
 *
 * @typedef {{
 *   id?: string | number;
 *   updated?: string;
 *   result?: unknown;
 *   error?: string;
 *   status?: {
 *     id?: string | number;
 *     result?: unknown;
 *     error?: string;
 *   };
 *   offerStatus?: { id?: string | number; numWantsSatisfied?: number };
 * }} UpdateRecord
 *
 * @typedef {{
 *   [name: string]: unknown;
 * }} BridgeAction
 */

/**
 * @typedef {{
 *   maxRetries?: number;
 *   retryIntervalMs?: number;
 *   setTimeout: typeof globalThis.setTimeout;
 *   log?: (...args: unknown[]) => void;
 * }} RetryOptions
 */

/**
 * @typedef {{
 *   sendBridgeAction: (action: BridgeAction) => Promise<{ code: number; rawLog?: string }>;
 *   query: {
 *     getLastUpdate: () => Promise<UpdateRecord>;
 *   };
 * }} SigningSmartWalletKit
 */

/**
 * Local retry helper to avoid a package-level edge on @agoric/client-utils.
 *
 * @template [T=unknown]
 * @param {() => Promise<T>} operation
 * @param {(result: T) => boolean} condition
 * @param {string} message
 * @param {RetryOptions} options
 * @returns {Promise<T>}
 */
const retryUntilCondition = async (
  operation,
  condition,
  message,
  { maxRetries = 6, retryIntervalMs = 3500, log = () => {}, setTimeout },
) => {
  for (let retries = 0; retries < maxRetries; retries += 1) {
    try {
      const result = await operation();
      if (condition(result)) {
        return result;
      }
    } catch (error) {
      log(error);
    }
    await new Promise(resolve => setTimeout(resolve, retryIntervalMs));
  }
  throw Error(`${message} condition failed after ${maxRetries} retries.`);
};

/**
 * Helper to wait for specific wallet updates
 *
 * This provides a higher-level API over retryUntilCondition for common
 * wallet update patterns.
 *
 * @param {() => Promise<UpdateRecord>} getLastUpdate
 * @param {RetryOptions & {
 *   log: (...args: unknown[]) => void;
 *   setTimeout: typeof globalThis.setTimeout;
 * }} retryOpts
 */
export const walletUpdates = (getLastUpdate, retryOpts) => {
  return harden({
    /**
     * Wait for an invocation to complete
     * @param {string | number} id
     */
    invocation: async id => {
      const done = /** @type {UpdateRecord & { updated: 'invocation' }} */ (
        await retryUntilCondition(
          getLastUpdate,
          update =>
            update.updated === 'invocation' &&
            update.id === id &&
            !!(update.result || update.error),
          `${id}`,
          retryOpts,
        )
      );
      if (done.error) throw Error(done.error);
      return done.result;
    },

    /**
     * Wait for an offer to complete
     * @param {string | number} id
     */
    offerResult: async id => {
      const done = await retryUntilCondition(
        getLastUpdate,
        update =>
          // walletAction implies an error, so also stop on that
          update.updated === 'walletAction' ||
          // if it's offerStatus, it can be in progress until result or error
          (update.updated === 'offerStatus' &&
            update.status?.id === id &&
            (!!update.status?.result || !!update.status?.error)),
        `${id}`,
        retryOpts,
      );
      switch (done.updated) {
        case 'walletAction': {
          const { status } = done;
          throw Error(`walletAction failure: ${status?.error}`);
        }
        case 'offerStatus': {
          const { status } = done;
          if (!status) {
            throw Error(`offerStatus missing status`);
          }
          if (status.error) {
            throw Error(`offerStatus failure: ${status.error}`);
          }
          if (!status.result) {
            throw Error(`offerStatus missing result`);
          }
          return status.result;
        }
        default:
          throw Error(`unexpected update type ${done.updated}`);
      }
    },
  });
};

/**
 * Redeem the ymaxControl invitation from the postal service
 *
 * This is a common pattern in ymax testing where we need to redeem
 * the control facet invitation delivered via postal service.
 *
 * @param {{
 *   sig: SigningSmartWalletKit;
 *   postalServiceInstance: Instance;
 *   fresh: () => string | number;
 *   log?: (...args: unknown[]) => void;
 * }} options
 * @returns {Promise<void>}
 */
export const redeemYmaxControlInvitation = async ({
  sig,
  postalServiceInstance,
  fresh,
  log = () => {},
}) => {
  const id = `redeem-${CONTRACT_CONTROL_WALLET_KEY}-${fresh()}`;
  log('Redeeming ymaxControl invitation', id);

  /** @type {BridgeAction} */
  const redeemAction = harden({
    method: 'executeOffer',
    offer: {
      id,
      invitationSpec: {
        source: 'purse',
        instance: postalServiceInstance,
        description: `deliver ${CONTRACT_CONTROL_WALLET_KEY}`,
      },
      proposal: {},
      saveResult: { name: CONTRACT_CONTROL_WALLET_KEY, overwrite: true },
    },
  });

  const tx = await sig.sendBridgeAction(redeemAction);
  if (tx.code !== 0) {
    throw Error(`Failed to redeem invitation: ${tx.rawLog}`);
  }

  const wup = walletUpdates(sig.query.getLastUpdate, {
    setTimeout: globalThis.setTimeout,
    log,
  });

  await wup.offerResult(id);
  log('ymaxControl invitation redeemed successfully');
};

/**
 * Helper to create action IDs with a consistent format
 *
 * @param {string} description
 * @param {() => string | number} [fresh]
 * @returns {string}
 */
export const makeActionId = (description, fresh = () => Date.now()) => {
  return `${description}.${fresh()}`;
};
