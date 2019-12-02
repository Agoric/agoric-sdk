import harden from '@agoric/harden';
/**
 * This is a very trivial contract to explain and test Zoe.
 * AutomaticRefund just gives you back what you put in. It has one
 * method: `makeOffer`, which takes an `escrowReceipt` (proof of
 * escrow with Zoe) as a parameter. AutomaticRefund then burns the
 * `escrowReceipt` and then tells Zoe to complete the offer, which
 * gives the user their payout through Zoe. Other contracts will use
 * these same steps, but they will have more sophisticated logic and
 * interfaces.
 * @param {contractFacet} zoe - the contract facet of zoe
 */
export const makeContract = harden((zoe, terms) => {
  let count = 0;
  const automaticRefund = harden({
    makeOffer: async escrowReceipt => {
      const { offerHandle } = await zoe.burnEscrowReceipt(escrowReceipt);
      count += 1;
      zoe.complete(harden([offerHandle]));
      return `The offer was accepted`;
    },
    getOffersCount: () => count,
  });
  return harden({
    instance: automaticRefund,
    assays: terms.assays,
  });
});
