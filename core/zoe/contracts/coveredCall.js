import harden from '@agoric/harden';

import { insist } from '../../../util/insist';
import { sameStructure } from '../../../util/sameStructure';

const makeContract = harden(zoe => {
  let firstOfferId;
  let firstOfferDesc;
  let matchingOfferId;

  const coveredCallAllowedTransitions = [
    ['uninitialized', ['acceptingOffers']],
    ['acceptingOffers', ['closed', 'cancelled']],
    ['closed', []],
    ['cancelled', []],
  ];

  const makeStateMachine = (initialState, allowedTransitionsArray) => {
    let state = initialState;
    const allowedTransitions = new Map(allowedTransitionsArray);
    return harden({
      canTransitionTo: nextState =>
        allowedTransitions.get(state).includes(nextState),
      transitionTo: nextState => {
        insist(allowedTransitions.get(state).includes(nextState));
        state = nextState;
      },
      getStatus: _ => state,
    });
  };

  const sm = makeStateMachine('uninitialized', coveredCallAllowedTransitions);

  const makeMatchingOfferDesc = () =>
    harden([
      {
        rule: firstOfferDesc[1].rule,
        assetDesc: firstOfferDesc[0].assetDesc,
      },
      {
        rule: firstOfferDesc[0].rule,
        assetDesc: firstOfferDesc[1].assetDesc,
      },
    ]);

  const makeOffer = async escrowReceipt => {
    const { id, offerMade: offerMadeDesc } = await zoe.burnEscrowReceipt(
      escrowReceipt,
    );

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

    // fail-fast if offers are not accepted or offer is not valid.
    if (
      sm.getStatus() !== 'acceptingOffers' ||
      !isMatchingOfferDesc(zoe.getExtentOps(), firstOfferDesc, offerMadeDesc)
    ) {
      zoe.complete(harden([id]));
      return Promise.reject(
        new Error(
          `The offer was invalid or the contract is not accepting offers. Please check your refund.`,
        ),
      );
    }

    // Save the valid offer
    matchingOfferId = id;

    sm.transitionTo('closed');
    const offerIds = harden([firstOfferId, matchingOfferId]);
    const [firstOfferExtents, matchingOfferExtents] = zoe.getExtentsFor(
      offerIds,
    );
    // reallocate by switching the extents of the firstOffer and matchingOffer
    zoe.reallocate(offerIds, harden([matchingOfferExtents, firstOfferExtents]));
    zoe.complete(offerIds);

    return `The offer has been accepted. Once the contract has been completed, please check your winnings`;
  };

  const institution = harden({
    async init(escrowReceipt) {
      const { id, offerMade: offerMadeDesc } = await zoe.burnEscrowReceipt(
        escrowReceipt,
      );

      const isValidFirstOfferDesc = newOfferDesc =>
        ['offerExactly', 'wantExactly'].every(
          (rule, i) => rule === newOfferDesc[i].rule,
          true,
        );

      // Eject if the offer is invalid
      if (
        sm.getStatus() !== 'uninitialized' ||
        !isValidFirstOfferDesc(offerMadeDesc)
      ) {
        zoe.complete(harden([id]));
        return Promise.reject(
          new Error(`The offer was invalid. Please check your refund.`),
        );
      }

      // Save the valid offer
      firstOfferId = id;
      firstOfferDesc = offerMadeDesc;
      sm.transitionTo('acceptingOffers');

      const customInviteExtent = {
        status: sm.getStatus(),
        offerMade: firstOfferDesc,
        offerToBeMade: makeMatchingOfferDesc(firstOfferDesc),
      };

      const invite = await zoe.makeInvite(
        customInviteExtent,
        harden({ makeOffer }),
      );

      return harden({
        outcome: `The offer has been accepted. Once the contract has been completed, please check your winnings`,
        invite,
      });
    },
    getStatus: _ => sm.getStatus(),
  });
  return institution;
});

const coveredCallSrcs = harden({
  makeContract: `${makeContract}`,
});

export { coveredCallSrcs };
