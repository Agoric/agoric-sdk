import harden from '@agoric/harden';
import { sameStructure } from '../../../util/sameStructure';

export const makeContract = harden((zoe, terms) => {
  let firstOfferId;

  const isMatchingOfferDesc = (extentOps, leftOffer, rightOffer) => {
    // "matching" means that assetDescs are the same, but that the
    // rules have switched places in the array
    return (
      extentOps[0].equals(
        leftOffer[0].assetDesc.extent,
        rightOffer[0].assetDesc.extent,
      ) &&
      extentOps[1].equals(
        leftOffer[1].assetDesc.extent,
        rightOffer[1].assetDesc.extent,
      ) &&
      sameStructure(
        leftOffer[0].assetDesc.label,
        rightOffer[0].assetDesc.label,
      ) &&
      sameStructure(
        leftOffer[1].assetDesc.label,
        rightOffer[1].assetDesc.label,
      ) &&
      leftOffer[0].rule === rightOffer[1].rule &&
      leftOffer[1].rule === rightOffer[0].rule
    );
  };

  const isValidFirstOfferDesc = newOfferDesc =>
    ['offerExactly', 'wantExactly'].every(
      (rule, i) => rule === newOfferDesc[i].rule,
    );

  const publicSwap = harden({
    makeOffer: async escrowReceipt => {
      const { id, conditions } = await zoe.burnEscrowReceipt(escrowReceipt);
      const { offerDesc: offerMadeDesc } = conditions;

      const acceptanceMsg = `The offer has been accepted. Once the contract has been completed, please check your winnings`;

      if (isValidFirstOfferDesc(offerMadeDesc)) {
        firstOfferId = id;
        return acceptanceMsg;
      }

      const { inactive } = zoe.getStatusFor(harden([firstOfferId]));
      if (inactive.length > 0) {
        zoe.complete(harden([id]));
        return Promise.reject(new Error(`The first offer was withdrawn.`));
      }

      const [firstOfferDesc] = zoe.getOfferDescsFor(harden([firstOfferId]));
      const extentOpsArray = zoe.getExtentOpsArray();

      if (isMatchingOfferDesc(extentOpsArray, firstOfferDesc, offerMadeDesc)) {
        const offerIds = harden([firstOfferId, id]);
        const [firstOfferExtents, matchingOfferExtents] = zoe.getExtentsFor(
          offerIds,
        );
        // reallocate by switching the extents of the firstOffer and matchingOffer
        zoe.reallocate(
          offerIds,
          harden([matchingOfferExtents, firstOfferExtents]),
        );
        zoe.complete(offerIds);
        return acceptanceMsg;
      }

      // Eject because the offer must be invalid
      zoe.complete(harden([id]));
      return Promise.reject(
        new Error(`The offer was invalid. Please check your refund.`),
      );
    },
  });
  return harden({
    instance: publicSwap,
    assays: terms.assays,
  });
});
