import harden from '@agoric/harden';

import makePromise from '../../../util/makePromise';
import { insist } from '../../../util/insist';

// Will be refactored

const makeCoveredCallMakerFn = srcs => zoe => {
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
        !srcs.isValidOfferDesc(
          zoe.getExtentOps(),
          offerToBeMadeDesc,
          offerMadeDesc,
        )
      ) {
        zoe.complete(harden([id]));
        offerResult.rej('offer was invalid');
        return offerResult.p;
      }

      // keep valid offer
      keepOffer(id, offerMadeDesc);
      const validIds = getValidOfferIds();

      if (sm.canTransitionTo('closed') && srcs.canReallocate(validIds)) {
        sm.transitionTo('closed');
        const extents = zoe.getExtentsFor(validIds);
        const reallocation = srcs.reallocate(extents);
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
      if (!srcs.isValidInitialOfferDesc(offerMadeDesc)) {
        zoe.complete(harden([id]));
        outcomeP.rej('The offer was invalid. Please check your refund.');
        return outcomeP.p;
      }

      keepOffer(id, offerMadeDesc);

      const wantedOffers = srcs.makeWantedOfferDescs(offerMadeDesc);

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
};

const makeCoveredCallSrcs = harden({
  makeContract: `${makeCoveredCallMakerFn}`,
});

export { makeCoveredCallSrcs };
