import { makeWalletStateCoalescer } from '@agoric/smart-wallet/src/utils.js';
import { makeStargateClient, pollBlocks } from './chain.js';
import { boardSlottingMarshaller, makeRpcUtils } from './rpc.js';

/**
 * @import {Amount, Brand} from '@agoric/ertp/src/types.js'
 */

export const makeWalletUtils = async ({ fetch, delay }, networkConfig) => {
  const { agoricNames, fromBoard, marshaller, readLatestHead, vstorage } =
    await makeRpcUtils({ fetch }, networkConfig);
  const m = boardSlottingMarshaller(fromBoard.convertSlotToVal);

  const client = await makeStargateClient(networkConfig);

  /**
   * @param {string} from
   * @param {number|string} [minHeight]
   */
  const storedWalletState = async (from, minHeight = undefined) => {
    const history = await vstorage.readFully(
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
   * @returns {Promise<import('@agoric/smart-wallet/src/smartWallet.js').UpdateRecord>}
   */
  const getLastUpdate = addr => {
    // @ts-expect-error cast
    return readLatestHead(`published.wallet.${addr}`);
  };

  return {
    networkConfig,
    agoricNames,
    fromBoard,
    marshaller,
    vstorage,
    getLastUpdate,
    readLatestHead,
    storedWalletState,
    pollOffer,
  };
};
/** @typedef {Awaited<ReturnType<typeof makeWalletUtils>>} WalletUtils */
