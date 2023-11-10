// @ts-check

import { AmountMath } from '@agoric/ertp/src/amountMath.js';
import { E, Far } from '@endo/far';
import { M } from '@endo/patterns';

const { Fail } = assert;

/** @type {ContractMeta} */
export const meta = {
  privateArgsShape: harden({ storageNode: M.remotable() }),
};

/**
 * @param {ZCF<{
 *   basePrice: Amount<'nat'>;
 * }>} zcf
 * @param {{
 *   storageNode: StorageNode;
 * }} privateArgs
 */
export const start = (zcf, privateArgs) => {
  const { basePrice } = zcf.getTerms();
  const { storageNode } = privateArgs;

  const { zcfSeat: fees } = zcf.makeEmptySeatKit();

  /**
   * @param {ZCFSeat} seat
   * @param {{ slug: string }} offerArgs
   */
  const buyStorageHook = async (seat, { slug }) => {
    assert.typeof(slug, 'string');

    const { give } = seat.getProposal();
    // IDEA: add entropy to name
    // IDEA: add check digits a la board
    // IDEA: higher price for lower entropy name
    AmountMath.isGTE(give.Payment, basePrice) ||
      Fail`Payment too low @@TODO detail`;

    zcf.atomicRearrange([[seat, fees, give]]);

    // IDEA: wrap storage node; charge on each call
    // TODO: constrain slug
    const goods = await E(storageNode).makeChildNode(slug);
    seat.exit();

    return goods;
  };

  const publicFacet = Far('VStoreShop API', {
    makeBuyStorageInvitation: () =>
      zcf.makeInvitation(
        buyStorageHook,
        'buy storage',
        // TODO: offer shape
      ),
  });

  const collectFeesHook = async seat => {
    const alloc = fees.getCurrentAllocation();
    zcf.atomicRearrange([[fees, seat, alloc]]);
    seat.exit();
    return alloc;
  };

  const creatorFacet = Far('VSorageShop Admin', {
    makeCollectFeesInvitation: () =>
      zcf.makeInvitation(collectFeesHook, 'collect fees'),
  });

  return { publicFacet, creatorFacet };
};
