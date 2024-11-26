import { makeWalletStateCoalescer } from '@agoric/smart-wallet/src/utils.js';
import { pollBlocks } from './chain.js';
import { makeStargateClient } from './rpc.js';
import { boardSlottingMarshaller, makeVstorageKit } from './vstorage-kit.js';

/**
 * @import {Amount, Brand} from '@agoric/ertp/src/types.js'
 * @import {CurrentWalletRecord, UpdateRecord} from '@agoric/smart-wallet/src/smartWallet.js';
 * @import {MinimalNetworkConfig} from './network-config.js';
 */

// XXX this is really a SmartWalletKit
/**
 * Augment VstorageKit with addtional convenience methods for working with
 * Agoric smart wallets.
 *
 * @param {object} root0
 * @param {typeof globalThis.fetch} root0.fetch
 * @param {(ms: number) => Promise<void>} root0.delay
 * @param {MinimalNetworkConfig} networkConfig
 */
export const makeWalletUtils = async ({ fetch, delay }, networkConfig) => {
  const vsk = await makeVstorageKit({ fetch }, networkConfig);

  const m = boardSlottingMarshaller(vsk.fromBoard.convertSlotToVal);

  const client = await makeStargateClient(networkConfig, { fetch });

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
    const { Invitation } = vsk.agoricNames.brand;
    const coalescer = makeWalletStateCoalescer(Invitation);
    // update with oldest first
    for (const txt of history.reverse()) {
      const { body, slots } = JSON.parse(txt);
      const record = m.fromCapData({ body, slots });
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
   * @param {number|string} minHeight
   * @param {boolean} [untilNumWantsSatisfied]
   */
  const pollOffer = async (
    from,
    id,
    minHeight,
    untilNumWantsSatisfied = false,
  ) => {
    const poll = pollBlocks({
      client,
      delay,
      retryMessage: 'offer not in wallet at block',
    });

    const lookup = async () => {
      const { offerStatuses } = await storedWalletState(from, minHeight);
      const offerStatus = [...offerStatuses.values()].find(s => s.id === id);
      if (!offerStatus) throw Error('retry');
      harden(offerStatus);
      if (untilNumWantsSatisfied && !('numWantsSatisfied' in offerStatus)) {
        throw Error('retry (no numWantsSatisfied yet)');
      }
      return offerStatus;
    };
    return poll(lookup);
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
    networkConfig,
    getLastUpdate,
    getCurrentWalletRecord,
    storedWalletState,
    pollOffer,
  };
};
/** @typedef {Awaited<ReturnType<typeof makeWalletUtils>>} WalletUtils */
