// @ts-check
import { retryUntilCondition } from '@agoric/client-utils';

/**
 * @import {UpdateRecord as UpdateRecord0} from '@agoric/smart-wallet/src/smartWallet';
 * @import {RetryOptions} from '@agoric/client-utils';
 */

/**
 * UpdateRecord0 is the type from the previously published npm package.
 *
 * @typedef {UpdateRecord0 | {
 *       updated: 'invocation';
 *       id: string | number;
 *       error?: string;
 *       result?: { name?: string; passStyle: string };
 * }} UpdateRecord
 */

export const walletUpdates = (
  /** @type {() => Promise<UpdateRecord>} */ getLastUpdate,
  /** @type {RetryOptions & { log: (...args: any[]) => void; setTimeout: typeof globalThis.setTimeout; }} */ retryOpts,
) => {
  return harden({
    invocation: async (/** @type {string | number} */ id) => {
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
    offerResult: async (/** @type {string | number} */ id) => {
      const done = /** @type {UpdateRecord & { updated: 'offerStatus' }} */ (
        await retryUntilCondition(
          getLastUpdate,
          update =>
            update.updated === 'offerStatus' &&
            update.status.id === id &&
            (!!update.status.result || !!update.status.error),
          `${id}`,
          retryOpts,
        )
      );
      if (done.status.error) throw Error(done.status.error);
      return done.status.result;
    },
    // payoutAmounts: ...
  });
};
