import { deeplyFulfilledObject, makeTracer, objectMap } from '@agoric/internal';
import { observeIteration, subscribeEach } from '@agoric/notifier';
import { E } from '@endo/far';

/**
 * @import {OfferId, OfferStatus} from './offers.js';
 * @import {UpdateRecord} from './smartWallet.js';
 * @import {Subscriber} from '@agoric/notifier';
 * @import {PublicSubscribers} from './types.js';
 * @import {TopicsRecord} from '@agoric/zoe/src/contractSupport/index.js';
 * @import {Instance} from '@agoric/zoe';
 * @import {Brand} from '@agoric/ertp';
 * @import {Amount} from '@agoric/ertp';
 * @import {ERef} from '@agoric/vow';
 */

const trace = makeTracer('WUTIL', false);

/** @param {Brand<'set'>} [invitationBrand] */
const makeCoalescer = (invitationBrand = undefined) => {
  /** @type {Map<OfferId, OfferStatus>} */
  const offerStatuses = new Map();
  /** @type {Map<Brand, Amount>} */
  const balances = new Map();

  /**
   * keyed by description; xxx assumes unique
   *
   * @type {Map<
   *   string,
   *   {
   *     acceptedIn?: OfferId;
   *     description: string;
   *     instance: Instance;
   *   }
   * >}
   */
  const invitationsReceived = new Map();

  /**
   * @param {UpdateRecord | {}} updateRecord newer than previous
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

// For backwards compatibility, we export the same function under the old name.
export { makeCoalescer as makeWalletStateCoalescer };

/**
 * Coalesce updates from a wallet UpdateRecord publication feed. Note that local
 * state may not reflect the wallet's state if the initial updates are missed.
 *
 * If this proves to be a problem we can add an option to this or a related
 * utility to reset state from RPC.
 *
 * @param {ERef<Subscriber<UpdateRecord>>} updates
 * @param {Brand<'set'>} [invitationBrand]
 */
export const coalesceUpdates = (updates, invitationBrand) => {
  const coalescer = makeCoalescer(invitationBrand);

  void observeIteration(subscribeEach(updates), {
    updateState: updateRecord => {
      coalescer.update(updateRecord);
    },
  });
  return coalescer.state;
};

/**
 * Handles the case of falsy argument so the caller can consistently await.
 *
 * @param {PublicSubscribers | TopicsRecord} [subscribers]
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
