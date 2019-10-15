import harden from '@agoric/harden';

const makeContract = harden(zoe => {
  let firstOfferId;
  let firstOfferDesc;
  let matchingOfferId;

  return harden({
    makeOffer: async escrowReceipt => {
      const { id, offerMade: offerMadeDesc } = await zoe.burnEscrowReceipt(
        escrowReceipt,
      );

      const isMatchingOfferDesc = (leftOffer, rightOffer) => {
        // "matching" means that assetDescs are the same, but that the
        // rules have switched places in the array
        return (
          leftOffer[0].assetDesc.extent === rightOffer[0].assetDesc.extent &&
          leftOffer[1].assetDesc.extent === rightOffer[1].assetDesc.extent &&
          leftOffer[0].assetDesc.label.assay ===
            rightOffer[0].assetDesc.label.assay &&
          leftOffer[1].assetDesc.label.assay ===
            rightOffer[1].assetDesc.label.assay &&
          leftOffer[0].rule === rightOffer[1].rule &&
          leftOffer[1].rule === rightOffer[0].rule
        );
      };

      const isFirstOffer = firstOfferId === undefined;

      const isValidFirstOfferDesc = newOfferDesc =>
        ['offerExactly', 'wantExactly'].every(
          (rule, i) => rule === newOfferDesc[i].rule,
          true,
        );

      const isValidOffer =
        (isFirstOffer && isValidFirstOfferDesc(offerMadeDesc)) ||
        (!isFirstOffer && isMatchingOfferDesc(firstOfferDesc, offerMadeDesc));

      // Eject if the offer is invalid
      if (!isValidOffer) {
        zoe.complete(harden([id]));
        return Promise.reject(
          new Error(`The offer was invalid. Please check your refund.`),
        );
      }

      // Save the valid offer
      if (firstOfferId === undefined) {
        firstOfferId = id;
        firstOfferDesc = offerMadeDesc;
      } else {
        matchingOfferId = id;
      }

      // Check if we can reallocate and reallocate.
      if (matchingOfferId !== undefined) {
        const offerIds = harden([firstOfferId, matchingOfferId]);
        const [firstOfferExtents, matchingOfferExtents] = zoe.getExtentsFor(
          offerIds,
        );
        // reallocate by switching the extents of the firstOffer and matchingOffer
        zoe.reallocate(
          offerIds,
          harden([matchingOfferExtents, firstOfferExtents]),
        );
        zoe.complete(offerIds);

        // clear state and start over
        firstOfferId = undefined;
        firstOfferDesc = undefined;
        matchingOfferId = undefined;
      }
      return `The offer has been accepted. Once the contract has been completed, please check your winnings`;
    },
  });
});

const publicSwapSrcs = harden({
  makeContract: `${makeContract}`,
});

export { publicSwapSrcs };
