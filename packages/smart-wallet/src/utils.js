// @ts-check

import { observeIteration, subscribeEach } from '@agoric/notifier';

/**
 * Coalesce updates from a wallet UpdateRecord publication feed. Note that local
 * state may not reflect the wallet's state if the initial updates are missed.
 *
 * If this proves to be a problem we can add an option to this or a related
 * utility to reset state from RPC.
 *
 * @param {ERef<Subscriber<import('./smartWallet').UpdateRecord>>} updates
 */
export const coalesceUpdates = updates => {
  /** @type {Map<Brand, import('./smartWallet').BrandDescriptor>} */
  const brands = new Map();
  /** @type {{ [id: number]: import('./offers').OfferStatus}} */
  const offerStatuses = {};
  /** @type {Map<Brand, Amount>} */
  const balances = new Map();
  observeIteration(subscribeEach(updates), {
    updateState: updateRecord => {
      const { updated } = updateRecord;
      switch (updateRecord.updated) {
        case 'balance': {
          const { currentAmount } = updateRecord;
          balances.set(currentAmount.brand, currentAmount);
          break;
        }
        case 'offerStatus': {
          const { status } = updateRecord;
          offerStatuses[status.id] = status;
          break;
        }
        case 'brand': {
          const { descriptor } = updateRecord;
          brands.set(descriptor.brand, descriptor);
          break;
        }
        default:
          throw new Error(`unknown record updated ${updated}`);
      }
    },
  });
  return { brands, offerStatuses, balances };
};
