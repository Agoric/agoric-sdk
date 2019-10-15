import harden from '@agoric/harden';

import makePromise from '../../../util/makePromise';
import { insist } from '../../../util/insist';

// Will be refactored
const makeContract = harden(zoe => {
  const isValidInitialOfferDesc = newOfferDesc => {
    const makeHasOkRules = validRules => offer =>
      validRules.every((rule, i) => rule === offer[i].rule, true);

    const hasOkLength = array => array.length === 2;
    const hasOkRules = offer =>
      makeHasOkRules(['offerExactly', 'wantExactly'])(offer) ||
      makeHasOkRules(['wantExactly', 'offerExactly'])(offer);
    return hasOkLength(newOfferDesc) && hasOkRules(newOfferDesc);
  };

  const makeWantedOfferDescs = firstOfferDesc => {
    const makeSecondOffer = firstOffer =>
      harden([
        {
          rule: firstOffer[1].rule,
          assetDesc: firstOffer[0].assetDesc,
        },
        {
          rule: firstOffer[0].rule,
          assetDesc: firstOffer[1].assetDesc,
        },
      ]);
    return harden([makeSecondOffer(firstOfferDesc)]);
  };

  const isValidOfferDesc = (extentOps, offerDescToBeMade, offerDescMade) => {
    const ruleEqual = (leftRule, rightRule) => leftRule.rule === rightRule.rule;

    const extentEqual = (extentOp, leftRule, rightRule) =>
      extentOp.equals(leftRule.assetDesc.extent, rightRule.assetDesc.extent);

    const assayEqual = (leftRule, rightRule) =>
      leftRule.assetDesc.label.assay === rightRule.assetDesc.label.assay;

    // Check that two offers are equal in both their rules and their assetDescs
    const offerEqual = (leftOffer, rightOffer) => {
      const isLengthEqual = leftOffer.length === rightOffer.length;
      if (!isLengthEqual) {
        return false;
      }
      return leftOffer.every(
        (leftRule, i) =>
          ruleEqual(leftRule, rightOffer[i]) &&
          assayEqual(leftRule, rightOffer[i]) &&
          extentEqual(extentOps[i], leftRule, rightOffer[i]),
        true,
      );
    };

    return offerEqual(offerDescToBeMade, offerDescMade);
  };

  const canReallocate = offerIds => offerIds.length === 2;

  const reallocate = allocations => harden([allocations[1], allocations[0]]);

  const makeOfferKeeper = () => {
    const validOfferIdsToDescs = new WeakMap();
    const validOfferIds = [];
    return harden({
      keepOffer: (offerId, offerDesc) => {
        validOfferIdsToDescs.set(offerId, offerDesc);
        validOfferIds.push(offerId);
      },
      getValidOfferIds: () => validOfferIds,
    });
  };

  const { keepOffer, getValidOfferIds } = makeOfferKeeper();

  const coveredCallallowedTransitions = [
    ['open', ['closed', 'cancelled']],
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

  const sm = makeStateMachine('open', coveredCallallowedTransitions);

  const makeOfferMaker = offerToBeMadeDesc => {
    const makeOffer = async escrowReceipt => {
      const offerResult = makePromise();
      const { id, offerMade: offerMadeDesc } = await zoe.burnEscrowReceipt(
        escrowReceipt,
      );
      if (sm.getStatus() !== 'open') {
        zoe.complete(harden([id]));
        offerResult.rej('offers are not accepted at this time');
        return offerResult.p;
      }

      // fail-fast if the offerDesc isn't valid
      if (
        !isValidOfferDesc(zoe.getExtentOps(), offerToBeMadeDesc, offerMadeDesc)
      ) {
        zoe.complete(harden([id]));
        offerResult.rej('offer was invalid');
        return offerResult.p;
      }

      // keep valid offer
      keepOffer(id, offerMadeDesc);
      const validIds = getValidOfferIds();

      if (sm.canTransitionTo('closed') && canReallocate(validIds)) {
        sm.transitionTo('closed');
        const extents = zoe.getExtentsFor(validIds);
        const reallocation = reallocate(extents);
        zoe.reallocate(validIds, reallocation);
        zoe.complete(validIds);
      }
      offerResult.res('offer successfully made');
      return offerResult.p;
    };
    return harden(makeOffer);
  };

  const institution = harden({
    async init(escrowReceipt) {
      const { id, offerMade: offerMadeDesc } = await zoe.burnEscrowReceipt(
        escrowReceipt,
      );
      const outcomeP = makePromise();
      // Eject if the offer is invalid
      if (!isValidInitialOfferDesc(offerMadeDesc)) {
        zoe.complete(harden([id]));
        outcomeP.rej('The offer was invalid. Please check your refund.');
        return outcomeP.p;
      }

      keepOffer(id, offerMadeDesc);

      const wantedOffers = makeWantedOfferDescs(offerMadeDesc);

      const invites = wantedOffers.map(async offer =>
        zoe.makeInvite(offer, harden({ makeOffer: makeOfferMaker(offer) })),
      );

      const inviteP = invites[0];

      outcomeP.res('offer successfully made');
      const [outcome, invite] = await Promise.all([outcomeP.p, inviteP]);
      /**
       * Seat: the seat for the initial player
       * Invites: invitations for all of the other seats that can
       * be sent to other players.
       * Both seat and invites are ERTP payments that can be
       * `unwrap`ed to get a use object.
       */
      return harden({
        outcome,
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
