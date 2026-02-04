// @ts-check
/**
 * Wallet state coalescing utilities copied from @agoric/smart-wallet/src/utils.js
 * to avoid a runtime dependency on @agoric/smart-wallet (which transitively depends on @agoric/vats).
 */

import { makeTracer } from '@agoric/internal';

/**
 * @import {OfferId, OfferStatus} from '@agoric/smart-wallet/src/offers.js';
 * @import {UpdateRecord} from '@agoric/smart-wallet/src/smartWallet.js';
 * @import {Instance} from '@agoric/zoe';
 * @import {Brand, Amount} from '@agoric/ertp';
 */

export const NO_SMART_WALLET_ERROR = 'no smart wallet';

const trace = makeTracer('WUTIL', false);

/** @param {Brand<'set'>} [invitationBrand] */
export const makeWalletStateCoalescer = invitationBrand => {
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
   *     acceptedIn: OfferId;
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
          for (const invitation of /** @type {any} */ (currentAmount.value)) {
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
