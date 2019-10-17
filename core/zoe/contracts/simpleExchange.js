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

const makeContract = harden(zoe => {
  let sellOrderOfferIds = [];
  let buyOrderOfferIds = [];

  const offerIdToOrder = new WeakMap();
  const getBuyOrders = () => buyOrderOfferIds.map(id => offerIdToOrder.get(id));
  const getSellOrders = () =>
    sellOrderOfferIds.map(id => offerIdToOrder.get(id));

  return harden({
    addOrder: async escrowReceipt => {
      const { id, offerMade: offerMadeDesc } = await zoe.burnEscrowReceipt(
        escrowReceipt,
      );

      const canMatch = (extentOps, sellOrder, buyOrder) => {
        const assetEqual = extentOps[0].equals(
          sellOrder[0].assetDesc.extent,
          buyOrder[0].assetDesc.extent,
        );
        const priceOk = extentOps[1].includes(
          buyOrder[1].assetDesc.extent,
          sellOrder[1].assetDesc.extent,
        );
        return assetEqual && priceOk;
      };

      const extentOps = zoe.getExtentOps();

      const reallocate = (sellOrderOfferId, buyOrderOfferId) => {
        const offerIds = harden([sellOrderOfferId, buyOrderOfferId]);

        const [sellOrderExtents, buyOrderExtents] = zoe.getExtentsFor(offerIds);

        // If there is a difference in what the seller will accept at
        // least and what the buyer will pay at most, we will award
        // the difference to the seller for no reason other than
        // simplicity. Note that to split the difference requires the
        // concept of dividing by two, which doesn't make sense for all
        // types of mints.
        const newSellOrderExtents = [extentOps[0].empty(), buyOrderExtents[1]];
        const newBuyOrderExtents = [sellOrderExtents[0], extentOps[0].empty()];

        zoe.reallocate(
          offerIds,
          harden([newSellOrderExtents, newBuyOrderExtents]),
        );
        zoe.complete(offerIds);

        // remove completed orders from state
        sellOrderOfferIds = sellOrderOfferIds.filter(
          offerId => offerId !== sellOrderOfferId,
        );
        buyOrderOfferIds = buyOrderOfferIds.filter(
          offerId => offerId !== buyOrderOfferId,
        );
        offerIdToOrder.delete(sellOrderOfferId);
        offerIdToOrder.delete(buyOrderOfferId);
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

      const offerAcceptedMessage = `The offer has been accepted. Once the contract has been completed, please check your winnings`;

      if (isValidSellOrder(offerMadeDesc)) {
        // Save the valid offer
        sellOrderOfferIds.push(id);
        offerIdToOrder.set(id, offerMadeDesc);

        // Try to match
        const buyOrders = getBuyOrders(); // same order as buyOrderOfferIds
        for (let i = 0; i < buyOrders.length; i += 1) {
          const buyOrder = buyOrders[i];
          const buyOrderOfferId = buyOrderOfferIds[i];
          if (canMatch(extentOps, offerMadeDesc, buyOrder)) {
            reallocate(id, buyOrderOfferId);
          }
        }
        return offerAcceptedMessage;
      }

      if (isValidBuyOrder(offerMadeDesc)) {
        // Save the valid offer
        buyOrderOfferIds.push(id);
        offerIdToOrder.set(id, offerMadeDesc);

        // Try to match
        const sellOrders = getSellOrders(); // same order as sellOrderOfferIds
        for (let i = 0; i < sellOrders.length; i += 1) {
          const sellOrder = sellOrders[i];
          const sellOrderOfferId = sellOrderOfferIds[i];
          if (canMatch(extentOps, sellOrder, offerMadeDesc)) {
            reallocate(sellOrderOfferId, id);
          }
        }
        return offerAcceptedMessage;
      }

      // Eject because the offer must be invalid
      zoe.complete(harden([id]));
      return Promise.reject(
        new Error(`The offer was invalid. Please check your refund.`),
      );
    },
  });
});

const simpleExchangeSrcs = harden({
  makeContract: `${makeContract}`,
});

export { simpleExchangeSrcs };
