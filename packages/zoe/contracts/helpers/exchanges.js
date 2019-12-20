import harden from '@agoric/harden';

export const makeExchangeHelpers = (zoe, assays) =>
  harden({
    isMatchingLimitOrder: (sellHandle, buyHandle) => {
      const unitOpsArray = zoe.getUnitOpsForAssays(assays);
      const { payoutRules: sellPayoutRules } = zoe.getOffer(sellHandle);
      const { payoutRules: buyPayoutRules } = zoe.getOffer(buyHandle);
      const assetEqual = unitOpsArray[0].equals(
        sellPayoutRules[0].units,
        buyPayoutRules[0].units,
      );
      // Buy extent must be higher than sell extent
      const buyPriceHigher = unitOpsArray[1].includes(
        buyPayoutRules[1].units,
        sellPayoutRules[1].units,
      );
      return assetEqual && buyPriceHigher;
    },
    reallocateSurplusToSeller: (sellHandle, buyHandle) => {
      const unitOpsArray = zoe.getUnitOpsForAssays(assays);
      const inviteHandles = harden([sellHandle, buyHandle]);
      const sellOfferUnits = zoe.getOffer(sellHandle).units;
      const buyOfferUnits = zoe.getOffer(buyHandle).units;

      // If there is a difference in what the seller will accept at
      // least and what the buyer will pay at most, we will award
      // the difference to the seller for no reason other than
      // simplicity. Note that to split the difference requires the
      // concept of dividing by two, which doesn't make sense for all
      // types of mints.
      const newSellOfferUnits = [unitOpsArray[0].empty(), buyOfferUnits[1]];
      const newBuyOfferUnits = [sellOfferUnits[0], unitOpsArray[1].empty()];

      zoe.reallocate(
        inviteHandles,
        harden([newSellOfferUnits, newBuyOfferUnits]),
      );
      zoe.complete(inviteHandles, assays);
    },
  });
