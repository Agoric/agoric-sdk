/* eslint-disable no-undef-init */
import { deeplyFulfilledObject, objectMap } from '@agoric/internal';
import { observeIteration, subscribeEach } from '@agoric/notifier';
import { E } from '@endo/far';

export const NO_SMART_WALLET_ERROR = 'no smart wallet';

export const makeWalletStateCoalescer = () => {
  /** @type {Map<Brand, import('./smartWallet').BrandDescriptor>} */
  const brands = new Map();
  /** @type {Map<import('./offers').OfferId, import('./offers').OfferStatus>} */
  const offerStatuses = new Map();
  /** @type {Map<Brand, Amount>} */
  const balances = new Map();

  /** @type {Brand=} */
  let allegedInvitationBrand = undefined;

  /**
   * keyed by description; xxx assumes unique
   *
   * @type {Map<import('./offers').OfferId, { acceptedIn: import('./offers').OfferId, description: string, instance: { boardId: string } }>}
   */
  const invitationsReceived = new Map();

  /** @param {import('./smartWallet').UpdateRecord} updateRecord newer than previous */
  const update = updateRecord => {
    const { updated } = updateRecord;
    switch (updateRecord.updated) {
      case 'balance': {
        const { currentAmount } = updateRecord;
        // last record wins
        balances.set(currentAmount.brand, currentAmount);
        if (allegedInvitationBrand) {
          console.warn(
            'balance update before invitationBrand known may be an invitation',
          );
        }
        if (currentAmount.brand === allegedInvitationBrand) {
          // @ts-expect-error narrow to SetValue
          for (const invitation of currentAmount.value) {
            invitationsReceived.set(invitation.description, invitation);
          }
        }
        break;
      }
      case 'offerStatus': {
        const { status } = updateRecord;
        const lastStatus = offerStatuses.get(status.id);
        // merge records
        offerStatuses.set(status.id, { ...lastStatus, ...status });
        if (
          status.invitationSpec.source === 'purse' &&
          status.numWantsSatisfied === 1
        ) {
          // record acceptance of invitation
          // xxx matching only by description
          const { description } = status.invitationSpec;
          const receptionRecord = invitationsReceived.get(description);
          if (receptionRecord) {
            invitationsReceived.set(description, {
              ...receptionRecord,
              acceptedIn: status.id,
            });
          } else {
            console.error('no record of invitation in offerStatus', status);
          }
        }
        break;
      }
      case 'brand': {
        const { descriptor } = updateRecord;
        // never mutate
        assert(!brands.has(descriptor.brand));
        brands.set(descriptor.brand, descriptor);
        if (descriptor.petname === 'invitations') {
          allegedInvitationBrand = descriptor.brand;
        }
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

  void observeIteration(subscribeEach(updates), {
    updateState: updateRecord => {
      coalescer.update(updateRecord);
    },
  });
  return coalescer.state;
};

/**
 *
 * @param {import('@agoric/casting').Follower<any>} follower
 * @throws if there is no first height
 */
export const assertHasData = async follower => {
  const eachIterable = E(follower).getReverseIterable();
  const iterator = await E(eachIterable)[Symbol.asyncIterator]();
  const el = await iterator.next();

  // done before we started
  if (el.done && !el.value) {
    assert.fail(NO_SMART_WALLET_ERROR);
  }
};

/**
 *
 * Handles the case of falsy argument so the caller can consistently await.
 *
 * @param {Record<string, ERef<StoredFacet>>} [subscribers]
 * @returns {ERef<Record<string, string>> | null}
 */
export const objectMapStoragePath = subscribers => {
  if (!subscribers) {
    return null;
  }
  return deeplyFulfilledObject(objectMap(subscribers, sub => E(sub).getPath()));
};
