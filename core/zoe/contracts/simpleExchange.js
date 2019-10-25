import harden from '@agoric/harden';

// This exchange only accepts limit orders. A limit order is defined
// as either a sell order: [ { rule: 'offerExactly', assetDesc1 }, {
// rule: 'wantAtLeast', assetDesc2 }] or a buy order: [ { rule:
// 'wantExactly', assetDesc1 }, { rule: 'offerAtMost', assetDesc2 }].
// Note that the asset in the first slot of the offer description will
// always be bought or sold in exact amounts, whereas the amount of
// the second asset received in a sell order may be greater than
// expected, and the amount of the second asset paid in a buy order
// may be less than expected. This simple exchange does not support
// partial fills of orders.

export const makeContract = harden((zoe, terms) => {
  const sellOfferHandles = [];
  const buyOfferHandles = [];

  const getActiveOfferDescs = offerHandles => {
    const { active } = zoe.getStatusFor(offerHandles);
    return zoe.getOfferDescsFor(active);
  };

  const canMatch = (extentOpsArray, sellOffer, buyOffer) => {
    const assetEqual = extentOpsArray[0].equals(
      sellOffer[0].assetDesc.extent,
      buyOffer[0].assetDesc.extent,
    );
    const priceOk = extentOpsArray[1].includes(
      buyOffer[1].assetDesc.extent,
      sellOffer[1].assetDesc.extent,
    );
    return assetEqual && priceOk;
  };

  const reallocate = (extentOpsArray, sellOfferHandle, buyOfferHandle) => {
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

  // TODO: check assays as well
  const isValidSellOrder = newOfferDesc =>
    ['offerExactly', 'wantAtLeast'].every(
      (rule, i) => rule === newOfferDesc[i].rule,
    );

  const isValidBuyOrder = newOfferDesc =>
    ['wantExactly', 'offerAtMost'].every(
      (rule, i) => rule === newOfferDesc[i].rule,
    );

  const simpleExchange = harden({
    addOrder: async escrowReceipt => {
      const { offerHandle, conditions } = await zoe.burnEscrowReceipt(
        escrowReceipt,
      );
      const { offerDesc: offerMadeDesc } = conditions;
      const extentOpsArray = zoe.getExtentOpsArray();
      const offerAcceptedMessage = `The offer has been accepted. Once the contract has been completed, please check your winnings`;

      if (isValidSellOrder(offerMadeDesc)) {
        // Save the valid offer
        sellOfferHandles.push(offerHandle);

        // Try to match
        const buyOffers = getActiveOfferDescs(buyOfferHandles); // same order as buyOfferHandles
        // eslint-disable-next-line array-callback-return
        buyOffers.map((buyOffer, i) => {
          if (canMatch(extentOpsArray, offerMadeDesc, buyOffer)) {
            reallocate(extentOpsArray, offerHandle, buyOfferHandles[i]);
          }
        });
        return offerAcceptedMessage;
      }

      if (isValidBuyOrder(offerMadeDesc)) {
        buyOfferHandles.push(offerHandle);

        // Try to match
        const sellOffers = getActiveOfferDescs(sellOfferHandles); // same order as sellOfferHandles
        // eslint-disable-next-line array-callback-return
        sellOffers.map((sellOffer, i) => {
          if (canMatch(extentOpsArray, sellOffer, offerMadeDesc)) {
            reallocate(extentOpsArray, sellOfferHandles[i], offerHandle);
          }
        });
        return offerAcceptedMessage;
      }

      // Eject because the offer must be invalid
      zoe.complete(harden([offerHandle]));
      return Promise.reject(
        new Error(`The offer was invalid. Please check your refund.`),
      );
    },
  });

  return harden({
    instance: simpleExchange,
    assays: terms.assays,
  });
});
