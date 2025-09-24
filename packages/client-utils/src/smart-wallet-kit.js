import { makeWalletStateCoalescer } from '@agoric/smart-wallet/src/utils.js';
import { retryUntilCondition } from './sync-tools.js';
import { makeAgoricNames, makeVstorageKit } from './vstorage-kit.js';

/**
 * @import {EReturn} from '@endo/far';
 * @import {Amount, Brand} from '@agoric/ertp/src/types.js'
 * @import {CurrentWalletRecord, UpdateRecord} from '@agoric/smart-wallet/src/smartWallet.js';
 * @import {MinimalNetworkConfig} from './network-config.js';
 */

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
    /** @type {UpdateRecord} */
    const done = await retryUntilCondition(
      () => getLastUpdate(from),
      update => {
        switch (update.updated) {
          // walletAction implies an error, so stop on that
          case 'walletAction':
            return true;
          case 'offerStatus':
            if (update.status.id !== id) {
              return false;
            }
            if (update.status.error) {
              // regardless of untilNumWantsSatisfied, stop on error
              return true;
            }
            if (untilNumWantsSatisfied) {
              return 'numWantsSatisfied' in update.status;
            }
            // Matches ID and we don't care about numWantsSatisfied
            return true;
          default:
            // a different kind of update, keep waiting
            return false;
        }
      },
      `${id}`,
      // XXX ambient authority
      { setTimeout: global.setTimeout },
    );
    switch (done.updated) {
      case 'walletAction':
        throw Error(`walletAction failure: ${done.status.error}`);
      case 'offerStatus':
        if (done.status.error) {
          throw Error(`offerStatus failure: ${done.status.error}`);
        }
        if (!done.status.result) {
          throw Error(`offerStatus missing result`);
        }
        return done.status;
      default:
        throw Error(`unexpected update type ${done.updated}`);
    }
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
