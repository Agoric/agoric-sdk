/* eslint-disable no-undef-init */
// @ts-check

import { iterateReverse } from '@agoric/casting';
import { observeIteration, subscribeEach } from '@agoric/notifier';

export const NO_SMART_WALLET_ERROR = 'no smart wallet';

export const makeWalletStateCoalescer = () => {
  /** @type {Map<Brand, import('./smartWallet').BrandDescriptor>} */
  const brands = new Map();
  /** @type {Map<number, import('./offers').OfferStatus>} */
  const offerStatuses = new Map();
  /** @type {Map<Brand, Amount>} */
  const balances = new Map();
  /** @type {Set<Amount>} */
  const invitationsReceived = new Set();

  /** @param {import('./smartWallet').UpdateRecord} updateRecord newer than previous */
  const update = updateRecord => {
    console.log('updating', { updateRecord });
    const { updated } = updateRecord;
    switch (updateRecord.updated) {
      case 'balance': {
        const { currentAmount } = updateRecord;
        // last record wins
        balances.set(currentAmount.brand, currentAmount);
        // @ts-expect-error  FIXME read invitation brand
        if (currentAmount.brand.boardId === 'board02810') {
          // @ts-expect-error narrow to SetValue
          for (const invitation of currentAmount.value) {
            invitationsReceived.add(invitation);
          }
        }
        break;
      }
      case 'offerStatus': {
        const { status } = updateRecord;
        const lastStatus = offerStatuses.get(status.id);
        // merge records
        offerStatuses.set(status.id, { ...lastStatus, ...status });
        break;
      }
      case 'brand': {
        const { descriptor } = updateRecord;
        // never mutate
        assert(!brands.has(descriptor.brand));
        brands.set(descriptor.brand, descriptor);
        break;
      }
      default:
        throw new Error(`unknown record updated ${updated}`);
    }
  };

  return {
    state: { brands, invitationsReceived, offerStatuses, balances },
    update,
  };
};
/** @typedef {ReturnType<typeof makeWalletStateCoalescer>['state']} CoalescedWalletState */

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
  const coalescer = makeWalletStateCoalescer();

  observeIteration(subscribeEach(updates), {
    updateState: updateRecord => {
      coalescer.update(updateRecord);
    },
  });
  return coalescer.state;
};

/**
 *
 * @param {import('@agoric/casting').Follower<any>} follower
 * @returns {Promise<number>}
 * @throws if there is no first height
 */
export const getFirstHeight = async follower => {
  /** @type {number=} */
  let firstHeight = undefined;
  for await (const { blockHeight } of iterateReverse(follower)) {
    // TODO: Only set firstHeight and break if the value contains all our state.
    firstHeight = blockHeight;
  }
  assert(firstHeight, NO_SMART_WALLET_ERROR);
  return firstHeight;
};

/**
 *
 * @param {import('@agoric/casting').Follower<import('@agoric/casting').ValueFollowerElement<import('./smartWallet').UpdateRecord>>} follower
 */
export const coalesceWalletState = async follower => {
  // values with oldest last
  const history = [];
  for await (const followerElement of iterateReverse(follower)) {
    history.push(followerElement.value);
  }

  const coalescer = makeWalletStateCoalescer();
  // update with oldest first
  for (const record of history.reverse()) {
    coalescer.update(record);
  }

  return coalescer.state;
};
