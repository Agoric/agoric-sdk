import { deeplyFulfilledObject, objectMap, makeTracer } from '@agoric/internal';
import { observeIteration, subscribeEach } from '@agoric/notifier';
import { E } from '@endo/far';

/** @import {OfferId, OfferStatus} from './offers.js'; */

export const NO_SMART_WALLET_ERROR = 'no smart wallet';

const trace = makeTracer('WUTIL', false);

/** @param {Brand<'set'>} [invitationBrand] */
export const makeWalletStateCoalescer = (invitationBrand = undefined) => {
  /** @type {Map<OfferId, OfferStatus>} */
  const offerStatuses = new Map();
  /** @type {Map<Brand, Amount>} */
  const balances = new Map();

  /**
   * keyed by description; xxx assumes unique
   *
   * @type {Map<
   *   OfferId,
   *   {
   *     acceptedIn: OfferId;
   *     description: string;
   *     instance: Instance;
   *   }
   * >}
   */
  const invitationsReceived = new Map();

  /**
   * @param {import('./smartWallet.js').UpdateRecord | {}} updateRecord newer
   *   than previous
   */
  const update = updateRecord => {
    if (!('updated' in updateRecord)) {
      return;
    }
    const { updated } = updateRecord;
    switch (updateRecord.updated) {
      case 'balance': {
        const { currentAmount } = updateRecord;
        // last record wins
        balances.set(currentAmount.brand, currentAmount);
        if (!invitationBrand) {
          trace(
            'balance update without invitationBrand known may be an invitation',
          );
        }
        if (currentAmount.brand === invitationBrand) {
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
            trace('no record of invitation in offerStatus', status);
          }
        }
        break;
      }
      // @ts-expect-error backwards compatibile
      case 'brand': {
        trace('obsolete brand update record - ignoring', updateRecord);
        break;
      }
      default:
        throw Error(`unknown record updated ${updated}`);
    }
  };

  return {
    state: { invitationsReceived, offerStatuses, balances },
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
 * @param {ERef<Subscriber<import('./smartWallet.js').UpdateRecord>>} updates
 * @param {Brand<'set'>} [invitationBrand]
 */
export const coalesceUpdates = (updates, invitationBrand) => {
  const coalescer = makeWalletStateCoalescer(invitationBrand);

  void observeIteration(subscribeEach(updates), {
    updateState: updateRecord => {
      coalescer.update(updateRecord);
    },
  });
  return coalescer.state;
};

/**
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
 * Handles the case of falsy argument so the caller can consistently await.
 *
 * @param {import('./types.js').PublicSubscribers
 *   | import('@agoric/zoe/src/contractSupport/index.js').TopicsRecord} [subscribers]
 * @returns {ERef<Record<string, string>> | null}
 */
export const objectMapStoragePath = subscribers => {
  if (!subscribers) {
    return null;
  }
  return deeplyFulfilledObject(
    objectMap(subscribers, sub =>
      // @ts-expect-error backwards compat
      'subscriber' in sub ? sub.storagePath : E(sub).getPath(),
    ),
  );
};
