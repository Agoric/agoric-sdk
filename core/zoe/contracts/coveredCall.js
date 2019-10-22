import harden from '@agoric/harden';

import { insist } from '../../../util/insist';
import { sameStructure } from '../../../util/sameStructure';

export const makeContract = harden((zoe, terms) => {
  let firstOfferId;
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

  const makeMatchingOfferDesc = firstOfferDesc =>
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

  const ejectPlayer = (
    offerId,
    message = `The offer was invalid. Please check your refund.`,
  ) => {
    zoe.complete(harden([offerId]));
    return Promise.reject(new Error(`${message}`));
  };

  const makeOffer = async escrowReceipt => {
    const { id, conditions } = await zoe.burnEscrowReceipt(escrowReceipt);
    const { offerDesc: offerMadeDesc } = conditions;
    const { inactive } = zoe.getStatusFor(harden([firstOfferId]));
    if (inactive.length > 0) {
      return ejectPlayer(id, 'The first offer was withdrawn');
    }

    // fail-fast if offer is not valid.
    const [firstOfferDesc] = zoe.getOfferDescsFor(harden([firstOfferId]));
    const extentOpsArray = zoe.getExtentOpsArray();
    if (
      sm.getStatus() !== 'acceptingOffers' ||
      !isMatchingOfferDesc(extentOpsArray, firstOfferDesc, offerMadeDesc)
    ) {
      return ejectPlayer(id);
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

  const coveredCall = harden({
    async init(escrowReceipt) {
      const { id, conditions } = await zoe.burnEscrowReceipt(escrowReceipt);
      const { offerDesc: offerMadeDesc } = conditions;

      const isValidFirstOfferDesc = newOfferDesc =>
        ['offerExactly', 'wantExactly'].every(
          (rule, i) => rule === newOfferDesc[i].rule,
        );

      // Eject if the offer is invalid
      if (
        sm.getStatus() !== 'uninitialized' ||
        !isValidFirstOfferDesc(offerMadeDesc)
      ) {
        return ejectPlayer(id);
      }

      // Save the valid offer
      firstOfferId = id;
      sm.transitionTo('acceptingOffers');

      const customInviteExtent = {
        status: sm.getStatus(),
        conditions,
        offerToBeMade: makeMatchingOfferDesc(offerMadeDesc),
      };

      const inviteP = zoe.makeInvite(customInviteExtent, harden({ makeOffer }));

      return harden({
        outcome: `The offer has been accepted. Once the contract has been completed, please check your winnings`,
        invite: inviteP,
      });
    },
    getStatus: _ => sm.getStatus(),
  });
  return harden({
    instance: coveredCall,
    assays: terms.assays,
  });
});
