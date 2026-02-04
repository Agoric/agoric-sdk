/* global globalThis */
import { Fail, q } from '@endo/errors';
import { retryUntilCondition } from './sync-tools.js';
import { makeAgoricNames, makeVstorageKit } from './vstorage-kit.js';

/**
 * @import {EReturn} from '@endo/far';
 * @import {Amount, Brand} from '@agoric/ertp/src/types.js'
 * @import {OfferId, OfferStatus} from '@agoric/smart-wallet/src/offers.js';
 * @import {CurrentWalletRecord, UpdateRecord} from '@agoric/smart-wallet/src/smartWallet.js';
 * @import {MinimalNetworkConfig} from './network-config.js';
 * @import {RetryOptionsAndPowers} from './sync-tools.js';
 * @import {VstorageKit} from './vstorage-kit.js';
 * @import {AgoricNamesRemotes} from '@agoric/vats/tools/board-utils.js';
 * @import {Instance, InvitationDetails} from '@agoric/zoe';
 */

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
          const invvitationBalnce =
            /** @type {Amount<'set', InvitationDetails>} */ (currentAmount);
          for (const invitation of invvitationBalnce.value) {
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
            throw Error(`no record of invitation in offerStatus ${status}`);
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
  // either `result` or `error` indicates settlement.
  const isMatch = update =>
    update.updated === 'walletAction' ||
    (update.updated === 'offerStatus' &&
      update.status.id === id &&
      !!(update.status.error || 'numWantsSatisfied' in update.status));
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
harden(getOfferWantsSatisfied);

/**
 * Augment VstorageKit with additional convenience methods for working with
 * Agoric smart wallets. This use of "kit" is unfortunate because it does not
 * pertain to a single smart wallet. (Whereas VstorageKit pertains to a single
 * vstorage tree.) It was once called WalletUtils, which is more accurate.
 *
 * @param {VstorageKit} vsk
 * @param {object} [options]
 * @param {boolean} [options.names]
 * @alpha
 */
export const makeSmartWalletKitFromVstorageKit = async (
  vsk,
  { names = true } = {},
) => {
  const agoricNames = await (names
    ? makeAgoricNames(vsk.fromBoard, vsk.vstorage)
    : /** @type {AgoricNamesRemotes} */ ({}));

  /**
   * @param {string} from
   * @param {number|string} [minHeight]
   */
  const storedWalletState = async (from, minHeight = undefined) => {
    const history = await vsk.vstorage.readFully(
      `published.wallet.${from}`,
      minHeight,
    );

    /** @type {{ Invitation: Brand<'set'> }} */
    // @ts-expect-error XXX how to narrow AssetKind to set?
    const { Invitation } = agoricNames.brand;
    const coalescer = makeWalletStateCoalescer(Invitation);
    // update with oldest first
    for (const txt of history.reverse()) {
      const { body, slots } = JSON.parse(txt);
      const record = vsk.marshaller.fromCapData({ body, slots });
      coalescer.update(record);
    }
    const coalesced = coalescer.state;
    harden(coalesced);
    return coalesced;
  };

  /**
   * Get OfferStatus by id, polling until available.
   *
   * @param {string} from
   * @param {string|number} id
   * @param {number|string} [minHeight] - deprecated, start polling before broadcasting the offer
   * @param {boolean} [untilNumWantsSatisfied]
   */
  const pollOffer = async (
    from,
    id,
    minHeight,
    untilNumWantsSatisfied = false,
  ) => {
    const getAddrLastUpdate = () => getLastUpdate(from);
    // XXX ambient authority
    const retryOpts = { setTimeout: globalThis.setTimeout };
    const status = await (untilNumWantsSatisfied
      ? getOfferWantsSatisfied(id, getAddrLastUpdate, retryOpts)
      : getOfferResult(id, getAddrLastUpdate, retryOpts));
    return status;
  };

  /**
   * @param {string} addr
   * @returns {Promise<UpdateRecord>}
   */
  const getLastUpdate = addr => {
    return vsk.readPublished(`wallet.${addr}`);
  };

  /**
   * @param {string} addr
   * @returns {Promise<CurrentWalletRecord>}
   */
  const getCurrentWalletRecord = addr => {
    return vsk.readPublished(`wallet.${addr}.current`);
  };

  return {
    // pass along all of VstorageKit
    ...vsk,
    agoricNames,
    getLastUpdate,
    getCurrentWalletRecord,
    storedWalletState,
    pollOffer,
  };
};
harden(makeSmartWalletKitFromVstorageKit);

/**
 * Augment VstorageKit with additional convenience methods for working with
 * Agoric smart wallets. This use of "kit" is unfortunate because it does not
 * pertain to a single smart wallet. (Whereas VstorageKit pertains to a single
 * vstorage tree.) It was once called WalletUtils, which is more accurate.
 *
 * @param {object} root0
 * @param {typeof globalThis.fetch} root0.fetch
 * @param {(ms: number) => Promise<void>} root0.delay
 * @param {boolean} [root0.names]
 * @param {MinimalNetworkConfig} networkConfig
 */
export const makeSmartWalletKit = async (
  {
    fetch,
    // eslint-disable-next-line no-unused-vars -- keep for removing ambient authority
    delay,
    names = true,
  },
  networkConfig,
) => {
  const vsk = makeVstorageKit({ fetch }, networkConfig);
  return makeSmartWalletKitFromVstorageKit(vsk, { names });
};
harden(makeSmartWalletKit);

/** @typedef {EReturn<typeof makeSmartWalletKit>} SmartWalletKit */
