import harden from '@agoric/harden';
import { hasValidPayoutRules, makeUnits } from './helpers/offerRules';
import { rejectOffer, defaultAcceptanceMsg } from './helpers/userFlow';
import { vectorWith, vectorWithout } from './helpers/extents';

// trade one moola for one simolean, forever
export const makeContract = harden((zoe, { assays }) => {
  let poolOfferHandle;

  const isValidSimpleSwapOffer = myPayoutRules => {
    const kindsOfferFirst = ['offerExactly', 'wantExactly'];
    const kindsWantFirst = ['wantExactly', 'offerExactly'];
    return (
      (hasValidPayoutRules(kindsOfferFirst, assays, myPayoutRules) ||
        hasValidPayoutRules(kindsWantFirst, assays, myPayoutRules)) &&
      myPayoutRules[0].units.extent === 1 &&
      myPayoutRules[1].units.extent === 1
    );
  };

  const addLiquidity = async escrowReceipt => {
    const { offerHandle } = await zoe.burnEscrowReceipt(escrowReceipt);
    poolOfferHandle = offerHandle;
    return 'Added liquidity';
  };

  const getPrice = unitsIn => {
    const indexIn = unitsIn[0].extent === 1 ? 0 : 1;
    const indexOut = 1 - indexIn;
    const extentOpsArray = zoe.getExtentOpsArray();
    const labels = zoe.getLabels();
    const unitsOut = makeUnits(extentOpsArray[indexOut], labels[indexOut], 1);
    return unitsOut;
  };

  const makeOffer = async escrowReceipt => {
    const {
      offerHandle,
      offerRules: { payoutRules },
    } = await zoe.burnEscrowReceipt(escrowReceipt);
    if (!isValidSimpleSwapOffer(payoutRules)) {
      return rejectOffer(zoe, offerHandle, 'The swap offer was invalid.');
    }
    const offerHandles = harden([poolOfferHandle, offerHandle]);
    const [poolExtents, offerExtents] = zoe.getExtentsFor(offerHandles);
    const [firstExtent, secondExtent] = offerExtents;
    const offerExtentsOut = [secondExtent, firstExtent];
    const extentOpsArray = zoe.getExtentOpsArray();
    // we want to add the thing offered to the pool and give back the
    // other thing
    const newPoolExtents = vectorWithout(
      extentOpsArray,
      vectorWith(extentOpsArray, poolExtents, offerExtents),
      offerExtentsOut,
    );
    zoe.reallocate(offerHandles, harden([newPoolExtents, offerExtentsOut]));
    zoe.complete(harden([offerHandle]));
    return defaultAcceptanceMsg;
  };

  // The API exposed to the user
  const simpleSwap = harden({
    addLiquidity,
    getPrice,
    makeOffer,
    getPoolExtents: () => zoe.getExtentsFor(harden([poolOfferHandle]))[0],
  });
  return harden({
    instance: simpleSwap,
    assays,
  });
});
