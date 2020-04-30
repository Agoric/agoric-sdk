// @ts-check
import harden from '@agoric/harden';

/** @typedef {import('../zoe').ContractFacet} ContractFacet */

/**
 * This is a very trivial contract to explain and test Zoe.
 * AutomaticRefund just gives you back what you put in.
 * AutomaticRefund tells Zoe to complete the
 * offer, which gives the user their payout through Zoe. Other
 * contracts will use these same steps, but they will have more
 * sophisticated logic and interfaces.
 *
 * @type {import('@agoric/zoe').MakeContract}
 */
export const makeContract = harden(
  /** @param {ContractFacet} zcf */ zcf => {
    let offersCount = 0;

    const refundOfferHook = offerHandle => {
      offersCount += 1;
      zcf.complete(harden([offerHandle]));
      return `The offer was accepted`;
    };
    const makeRefundInvite = () =>
      zcf.makeInvitation(refundOfferHook, 'getRefund');

    return harden({
      invite: makeRefundInvite(),
      publicAPI: {
        getOffersCount: () => offersCount,
        makeInvite: makeRefundInvite,
      },
    });
  },
);
