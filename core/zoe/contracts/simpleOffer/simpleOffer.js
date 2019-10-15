import harden from '@agoric/harden';

import makePromise from '../../../../util/makePromise';

const makeSimpleOfferMakerFn = srcs => {
  const simpleOffer = zoe => {
    const offerIdsToOfferDescs = new WeakMap();
    const offerIds = [];

    return harden({
      makeOffer: async escrowReceipt => {
        const { id, offerMade: offerMadeDesc } = await zoe.burnEscrowReceipt(
          escrowReceipt,
        );

        const status = makePromise();

        // Eject if the offer is invalid
        if (
          !srcs.isValidOffer(
            zoe.getExtentOps(),
            offerIds,
            offerIdsToOfferDescs,
            offerMadeDesc,
          )
        ) {
          zoe.complete(harden([id]));
          status.rej('The offer was invalid. Please check your refund.');
          return status.p;
        }

        // Save the offer.
        offerIdsToOfferDescs.set(id, offerMadeDesc);
        offerIds.push(id);

        // Check if we can reallocate and reallocate.
        if (srcs.canReallocate(offerIds, offerIdsToOfferDescs)) {
          const { reallocOfferIds, reallocExtents } = srcs.reallocate(
            zoe.getExtentOps(),
            offerIds,
            offerIdsToOfferDescs,
            zoe.getExtentsFor,
          );
          zoe.reallocate(reallocOfferIds, reallocExtents);
          zoe.complete(offerIds);
        }

        status.res(
          'The offer has been accepted. Once the contract has been completed, please check your winnings',
        );
        return status.p;
      },
    });
  };
  return simpleOffer;
};

function add2Fn(x) {
  return x + 2;
}

const simpleOfferSrcs = harden({
  makeContract: `${makeSimpleOfferMakerFn}`,
  add2: `${add2Fn}`,
});

export { simpleOfferSrcs };
