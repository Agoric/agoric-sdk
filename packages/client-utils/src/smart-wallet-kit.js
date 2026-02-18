/* global globalThis */
import { makeAgoricNames, makeVstorageKit } from './vstorage-kit.js';
import {
  getOfferResult,
  getOfferWantsSatisfied,
  makeWalletStateCoalescer,
} from './smart-wallet-utils.js';

/**
 * @import {EReturn} from '@endo/far';
 * @import {Amount, Brand} from '@agoric/ertp/src/types.js'
 * @import {OfferId, OfferStatus} from '@agoric/smart-wallet/src/offers.js';
 * @import {CurrentWalletRecord, UpdateRecord} from '@agoric/smart-wallet/src/smartWallet.js';
 * @import {MinimalNetworkConfig} from './network-config.js';
 * @import {RetryOptionsAndPowers} from './sync-tools.js';
 * @import {VstorageKit} from './types.js';
 * @import {AgoricNamesRemotes} from '@agoric/vats/tools/board-utils.js';
 * @import {Instance, InvitationDetails} from '@agoric/zoe';
 */

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
   * @param {number|string} [_minHeight] - deprecated, start polling before broadcasting the offer
   * @param {boolean} [untilNumWantsSatisfied]
   */
  const pollOffer = async (
    from,
    id,
    _minHeight = undefined,
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
    delay: _delay,
    names = true,
  },
  networkConfig,
) => {
  void _delay;
  const vsk = makeVstorageKit({ fetch }, networkConfig);
  return makeSmartWalletKitFromVstorageKit(vsk, { names });
};
harden(makeSmartWalletKit);

/** @typedef {EReturn<typeof makeSmartWalletKit>} SmartWalletKit */
