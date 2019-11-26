import harden from '@agoric/harden';

export const isMatchingLimitOrder = (zoe, sellOffer, buyOffer) => {
  const extentOpsArray = zoe.getExtentOpsArray();
  const assetEqual = extentOpsArray[0].equals(
    sellOffer[0].units.extent,
    buyOffer[0].units.extent,
  );
  // Buy extent must be higher than sell extent
  const buyPriceHigher = extentOpsArray[1].includes(
    buyOffer[1].units.extent,
    sellOffer[1].units.extent,
  );
  return assetEqual && buyPriceHigher;
};

export const reallocateSurplusToSeller = (
  zoe,
  sellOfferHandle,
  buyOfferHandle,
) => {
  const extentOpsArray = zoe.getExtentOpsArray();
  const offerHandles = harden([sellOfferHandle, buyOfferHandle]);
  const [sellOfferExtents, buyOfferExtents] = zoe.getExtentsFor(offerHandles);

  // If there is a difference in what the seller will accept at
  // least and what the buyer will pay at most, we will award
  // the difference to the seller for no reason other than
  // simplicity. Note that to split the difference requires the
  // concept of dividing by two, which doesn't make sense for all
  // types of mints.
  const newSellOrderExtents = [extentOpsArray[0].empty(), buyOfferExtents[1]];
  const newBuyOrderExtents = [sellOfferExtents[0], extentOpsArray[0].empty()];

  zoe.reallocate(
    offerHandles,
    harden([newSellOrderExtents, newBuyOrderExtents]),
  );
  zoe.complete(offerHandles);
};
