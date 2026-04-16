import { Fail, q } from '@endo/errors';
import { retryUntilCondition } from './sync-tools.js';

/**
 * @import {Amount, Brand} from '@agoric/ertp/src/types.js'
 * @import {OfferId, OfferStatus} from '@agoric/smart-wallet/src/offers.js';
 * @import {UpdateRecord} from '@agoric/smart-wallet/src/smartWallet.js';
 * @import {RetryOptionsAndPowers} from './sync-tools.js';
 * @import {Instance, InvitationDetails} from '@agoric/zoe';
 */

/**
 * @deprecated better to use an async iterator over updates going backward in time
 * @param {Brand<'set'>} [invitationBrand]
 */
export const makeWalletStateCoalescer = (invitationBrand = undefined) => {
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
        if (currentAmount.brand === invitationBrand) {
          const invitationBalance =
            /** @type {Amount<'set', InvitationDetails>} */ (currentAmount);
          for (const invitation of invitationBalance.value) {
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
            throw Error(
              `no record of invitation in offerStatus ${JSON.stringify(status)}`,
            );
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

/**
 * @param {string | number} id
 * @param {() => Promise<UpdateRecord>} getLastUpdate
 * @param {RetryOptionsAndPowers} retryOpts
 * @param {(update: UpdateRecord) => boolean} isMatch
 * @returns {Promise<UpdateRecord>}
 */
const findUpdate = (id, getLastUpdate, retryOpts, isMatch) =>
  retryUntilCondition(getLastUpdate, isMatch, `${id}`, retryOpts);

/**
 * Wait for an update indicating settlement of the specified invocation and
 * return its result or throw its error.
 * @alpha
 *
 * @param {string | number} id
 * @param {() => Promise<UpdateRecord>} getLastUpdate
 * @param {RetryOptionsAndPowers} retryOpts
 * @returns {Promise<(UpdateRecord & { updated: 'invocation' })['result']>}
 */
export const getInvocationUpdate = async (id, getLastUpdate, retryOpts) => {
  /** @type {(update: UpdateRecord) => boolean} */
  const isMatch = update =>
    update.updated === 'invocation' &&
    update.id === id &&
    !!(update.error || update.result);
  const found = /** @type {UpdateRecord & { updated: 'invocation' }} */ (
    await findUpdate(id, getLastUpdate, retryOpts, isMatch)
  );
  if (found.error) throw Error(found.error);
  return found.result;
};
harden(getInvocationUpdate);

/**
 * Wait for an update indicating settlement of the specified offer and return
 * its status or throw its error.
 * Used internally but not yet considered public.
 * @alpha
 *
 * @param {string | number} id
 * @param {() => Promise<UpdateRecord>} getLastUpdate
 * @param {RetryOptionsAndPowers} retryOpts
 * @returns {Promise<OfferStatus>}
 */
export const getOfferResult = async (id, getLastUpdate, retryOpts) => {
  // "walletAction" indicates an error, "offerStatus" with the right id and
  // either `result` or `error` indicates settlement.
  /** @type {(update: UpdateRecord) => boolean} */
  const isMatch = update =>
    update.updated === 'walletAction' ||
    (update.updated === 'offerStatus' &&
      update.status.id === id &&
      !!(update.status.error || update.status.result));
  const found =
    /** @type {UpdateRecord & { updated: 'walletAction' | 'offerStatus' }} */ (
      await findUpdate(id, getLastUpdate, retryOpts, isMatch)
    );
  if (found.updated !== 'offerStatus') {
    throw Fail`${q(id)} ${q(found.updated)} failure: ${q(found.status?.error)}`;
  }
  const { error, result } = found.status;
  !error || Fail`${q(id)} offerStatus failure: ${q(error)}`;
  result || Fail`${q(id)} offerStatus missing result`;
  return found.status;
};
harden(getOfferResult);

/**
 * Wait for an update indicating untilNumWantsSatisfied of the specified offer
 * and return its status or throw its error.
 * Used internally but not yet considered public.
 * @alpha
 *
 * @param {string | number} id
 * @param {() => Promise<UpdateRecord>} getLastUpdate
 * @param {RetryOptionsAndPowers} retryOpts
 * @returns {Promise<OfferStatus>}
 */
export const getOfferWantsSatisfied = async (id, getLastUpdate, retryOpts) => {
  // "walletAction" indicates an error, "offerStatus" with the right id and
  // either `result`, `error`, or `numWantsSatisfied` indicates settlement.
  /** @type {(update: UpdateRecord) => boolean} */
  const isMatch = update =>
    update.updated === 'walletAction' ||
    (update.updated === 'offerStatus' &&
      update.status.id === id &&
      !!(
        update.status.error ||
        update.status.result ||
        'numWantsSatisfied' in update.status
      ));
  const found =
    /** @type {UpdateRecord & { updated: 'walletAction' | 'offerStatus' }} */ (
      await findUpdate(id, getLastUpdate, retryOpts, isMatch)
    );
  if (found.updated !== 'offerStatus') {
    throw Fail`${q(id)} ${q(found.updated)} failure: ${q(found.status?.error)}`;
  }
  const { error, result } = found.status;
  !error || Fail`${q(id)} offerStatus failure: ${q(error)}`;
  result ||
    'numWantsSatisfied' in found.status ||
    Fail`${q(id)} offerStatus missing result`;
  return found.status;
};
harden(getOfferWantsSatisfied);
