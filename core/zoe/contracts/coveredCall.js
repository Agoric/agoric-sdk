import harden from '@agoric/harden';

import { insist } from '../../../util/insist';
import { sameStructure } from '../../../util/sameStructure';

export const makeContract = harden((zoe, terms) => {
  let firstOfferHandle;
  let matchingOfferHandle;

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

  const makeMatchingPayoutRules = firstPayoutRules =>
    harden([
      {
        kind: firstPayoutRules[1].kind,
        assetDesc: firstPayoutRules[0].assetDesc,
      },
      {
        kind: firstPayoutRules[0].kind,
        assetDesc: firstPayoutRules[1].assetDesc,
      },
    ]);

  const isMatchingPayoutRules = (extentOps, leftOffer, rightOffer) => {
    // "matching" means that assetDescs are the same, but that the
    // kinds have switched places in the array
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
      leftOffer[0].kind === rightOffer[1].kind &&
      leftOffer[1].kind === rightOffer[0].kind
    );
  };

  const ejectPlayer = (
    offerHandle,
    message = `The offer was invalid. Please check your refund.`,
  ) => {
    zoe.complete(harden([offerHandle]));
    return Promise.reject(new Error(`${message}`));
  };

  const makeOffer = async escrowReceipt => {
    const {
      offerHandle,
      offerRules: { payoutRules },
    } = await zoe.burnEscrowReceipt(escrowReceipt);
    const { inactive } = zoe.getStatusFor(harden([firstOfferHandle]));
    if (inactive.length > 0) {
      return ejectPlayer(offerHandle, 'The first offer was withdrawn');
    }

    // fail-fast if offer is not valid.
    const [firstPayoutRules] = zoe.getPayoutRulessFor(
      harden([firstOfferHandle]),
    );
    const extentOpsArray = zoe.getExtentOpsArray();
    if (
      sm.getStatus() !== 'acceptingOffers' ||
      !isMatchingPayoutRules(extentOpsArray, firstPayoutRules, payoutRules)
    ) {
      return ejectPlayer(offerHandle);
    }

    // Save the valid offer
    matchingOfferHandle = offerHandle;

    sm.transitionTo('closed');
    const offerHandles = harden([firstOfferHandle, matchingOfferHandle]);
    const [firstOfferExtents, matchingOfferExtents] = zoe.getExtentsFor(
      offerHandles,
    );
    // reallocate by switching the extents of the firstOffer and matchingOffer
    zoe.reallocate(
      offerHandles,
      harden([matchingOfferExtents, firstOfferExtents]),
    );
    zoe.complete(offerHandles);
    return `The offer has been accepted. Once the contract has been completed, please check your winnings`;
  };

  const coveredCall = harden({
    async init(escrowReceipt) {
      const { offerHandle, offerRules } = await zoe.burnEscrowReceipt(
        escrowReceipt,
      );
      const { payoutRules } = offerRules;

      const isValidFirstPayoutRules = newPayoutRules =>
        ['offerExactly', 'wantExactly'].every(
          (kind, i) => kind === newPayoutRules[i].kind,
        );

      // Eject if the offer is invalid
      if (
        sm.getStatus() !== 'uninitialized' ||
        !isValidFirstPayoutRules(payoutRules)
      ) {
        return ejectPlayer(offerHandle);
      }

      // Save the valid offer
      firstOfferHandle = offerHandle;
      sm.transitionTo('acceptingOffers');

      const customInviteExtent = {
        status: sm.getStatus(),
        offerMadeRules: offerRules,
        offerToBeMade: makeMatchingPayoutRules(payoutRules),
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
