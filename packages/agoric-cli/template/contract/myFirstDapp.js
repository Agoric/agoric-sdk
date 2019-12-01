import harden from '@agoric/harden';
import { hasValidPayoutRules, makeUnits } from '@agoric/ertp/core/zoe/contracts/helpers/offerRules';
import { rejectOffer, defaultAcceptanceMsg } from '@agoric/ertp/core/zoe/contracts/helpers/userFlow';
import { vectorWith, vectorWithout } from '@agoric/ertp/core/zoe/contracts/helpers/extents';

import { makeMint } from '@agoric/ertp/core/mint';

/**  EDIT THIS CONTRACT WITH YOUR OWN BUSINESS LOGIC */

/**
 * This contract has a similar interface to the autoswap contract, but
 * doesn't do much. The contract assumes that the first offer it
 * receives adds 1 unit of each assay as liquidity. Then, a user can
 * trade 1 of the first assay for 1 of the second assay and vice versa
 * for as long as they want, as long as they alternate the direction
 * of the trade.
 *
 * Please see autoswap.js for the real version of a uniswap implementation.
 */
export const makeContract = harden((zoe, terms) => {
  // The user passes in an array of two assays for the two kinds of
  // assets to be swapped.
  const startingAssays = terms.assays;

  // There is also a third assay, the assay for the liquidity token,
  // which is created in this contract. We will return all three as
  // the canonical array of assays for this contract

  // TODO: USE THE LIQUIDITY MINT TO MINT TOKENS
  const liquidityMint = makeMint('liquidity');
  const liquidityAssay = liquidityMint.getAssay();
  const assays = [...startingAssays, liquidityAssay];

  // This offer handle is used to store the assets in the liquidity pool.
  let poolOfferHandle;

  // Let's make sure the swap offer that we get has the correct
  // structure.
  const isValidSimpleSwapOffer = myPayoutRules => {
    const kindsOfferFirst = ['offerExactly', 'wantAtLeast', 'wantAtLeast'];
    const kindsWantFirst = ['wantAtLeast', 'offerExactly', 'wantAtLeast'];
    return (
      hasValidPayoutRules(kindsOfferFirst, assays, myPayoutRules) ||
      hasValidPayoutRules(kindsWantFirst, assays, myPayoutRules)
    );
  };

  // This dumb contract assumes that the first offer this
  // receives is to add 1 unit of liquidity for both assays. If we
  // don't do this, this contract will break.
  const addLiquidity = async escrowReceipt => {
    const { offerHandle } = await zoe.burnEscrowReceipt(escrowReceipt);
    // TODO: CHECK HERE THAT OFFER IS A VALID LIQUIDITY OFFER

    // Create an empty offer to represent the extents of the
    // liquidity pool.
    if (poolOfferHandle === undefined) {
      poolOfferHandle = zoe.escrowEmptyOffer();
    }

    // This will only happen once so we will just swap the pool
    // extents and the offer extents to put what was offered in the
    // pool.
    const offerHandles = harden([poolOfferHandle, offerHandle]);
    const [poolExtents, offerExtents] = await zoe.getExtentsFor(offerHandles);

    zoe.reallocate(offerHandles, [offerExtents, poolExtents]);
    zoe.complete(harden([offerHandle]));

    // TODO: MINT LIQUIDITY TOKENS AND REALLOCATE THEM TO THE USER
    // THROUGH ZOE HERE
    return 'Added liquidity';
  };

  // The price is always 1. Always.
  // TODO: CHANGE THIS AND CREATE YOUR OWN BONDING CURVE
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

    // TODO: CHANGE THIS TO ADD YOUR OWN CHECKS HERE
    if (!isValidSimpleSwapOffer(payoutRules)) {
      return rejectOffer(zoe, offerHandle, 'The swap offer was invalid.');
    }
    const offerHandles = harden([poolOfferHandle, offerHandle]);
    const [poolExtents, offerExtents] = zoe.getExtentsFor(offerHandles);
    const extentOpsArray = zoe.getExtentOpsArray();
    const [firstExtent, secondExtent] = offerExtents;
    const offerExtentsOut = [
      secondExtent,
      firstExtent,
      extentOpsArray[2].empty(),
    ];
    // we want to add the thing offered to the pool and give back the
    // other thing
    // TODO: ADD YOUR OWN LOGIC HERE
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
    getLiquidityAssay: () => liquidityAssay,
    // IMPLEMENT THIS
    // removeLiquidity,
    getPoolExtents: () => zoe.getExtentsFor(harden([poolOfferHandle]))[0],
  });
  return harden({
    instance: simpleSwap,
    assays,
  });
});
