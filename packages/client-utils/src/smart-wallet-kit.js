import { Fail, q } from '@endo/errors';
import { makeWalletStateCoalescer } from '@agoric/smart-wallet/src/utils.js';
import { retryUntilCondition } from './sync-tools.js';
import { makeAgoricNames, makeVstorageKit } from './vstorage-kit.js';

/**
 * @import {EReturn} from '@endo/far';
 * @import {Amount, Brand} from '@agoric/ertp/src/types.js'
 * @import {OfferStatus} from '@agoric/smart-wallet/src/offers.js';
 * @import {CurrentWalletRecord, UpdateRecord} from '@agoric/smart-wallet/src/smartWallet.js';
 * @import {MinimalNetworkConfig} from './network-config.js';
 * @import {RetryOptionsAndPowers} from './sync-tools.js';
 */

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
 * Augment VstorageKit with addtional convenience methods for working with
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

  const agoricNames = await (names
    ? makeAgoricNames(vsk.fromBoard, vsk.vstorage)
    : /** @type {import('@agoric/vats/tools/board-utils.js').AgoricNamesRemotes} */ ({}));

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
    const retryOpts = { setTimeout: global.setTimeout };
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
/** @typedef {EReturn<typeof makeSmartWalletKit>} SmartWalletKit */
