import harden from '@agoric/harden';
import { makeMint } from '@agoric/ertp/core/mint';
import { natSafeMath } from './helpers/safeMath';
import { rejectOffer } from './helpers/userFlow';
import { vectorWith, vectorWithout } from './helpers/extents';
import {
  hasValidPayoutRules,
  makeUnits,
  makeOfferRules,
} from './helpers/offerRules';

export const makeContract = harden((zoe, terms) => {
  // The user passes in an array of two assays for the two kinds of
  // assets to be swapped.
  const startingAssays = terms.assays;

  // There is also a third assay, the assay for the liquidity token,
  // which is created in this contract. We will return all three as
  // the canonical array of assays for this contract
  const liquidityMint = makeMint('liquidity');
  const liquidityAssay = liquidityMint.getAssay();
  const assays = [...startingAssays, liquidityAssay];

  let poolOfferHandle;
  let liqTokenSupply = 0;

  const { add, subtract, multiply, divide } = natSafeMath;

  const addLiquidity = async escrowReceipt => {
    const extentOpsArray = zoe.getExtentOpsArray();
    const {
      offerHandle,
      offerRules: { payoutRules },
    } = await zoe.burnEscrowReceipt(escrowReceipt);

    // Create an empty offer to represent the extents of the
    // liquidity pool.
    if (poolOfferHandle === undefined) {
      poolOfferHandle = zoe.escrowEmptyOffer();
    }

    const kinds = ['offerExactly', 'offerExactly', 'wantAtLeast'];
    if (!hasValidPayoutRules(kinds, assays, payoutRules)) {
      return rejectOffer(
        zoe,
        offerHandle,
        'The offer to add liquidity was invalid.',
      );
    }

    const [oldPoolExtents, playerExtents] = zoe.getExtentsFor(
      harden([poolOfferHandle, offerHandle]),
    );

    // Calculate how many liquidity tokens we should be minting.
    // Calculations are based on the extents represented by index 0.
    // If the current supply is zero, start off by just taking the
    // extent at index 0 and using it as the extent for the
    // liquidity token.
    const liquidityEOut =
      liqTokenSupply > 0
        ? divide(multiply(playerExtents[0], liqTokenSupply), oldPoolExtents[0])
        : playerExtents[0];

    // Calculate the new pool extents by adding together the old
    // extents plus the liquidity that was just added
    const newPoolExtents = vectorWith(
      extentOpsArray,
      oldPoolExtents,
      playerExtents,
    );

    // Set the liquidity token extent in the array of extents that
    // will be turned into payments sent back to the user.
    const newPlayerExtents = zoe.makeEmptyExtents();
    newPlayerExtents[2] = liquidityEOut;

    // Now we need to mint the liquidity tokens and make sure that the
    // `zoe` knows about them. We will need to create an offer
    // that escrows the liquidity tokens, and then drop the result.
    const newPurse = liquidityMint.mint(liquidityEOut);
    const newPayment = newPurse.withdrawAll();
    liqTokenSupply += liquidityEOut;

    const liquidityOfferKinds = ['wantAtLeast', 'wantAtLeast', 'offerExactly'];
    const extents = [
      extentOpsArray[0].empty(),
      extentOpsArray[1].empty(),
      liquidityEOut,
    ];
    const exitRule = {
      kind: 'noExit',
    };
    const liquidityOfferRules = makeOfferRules(
      zoe,
      liquidityOfferKinds,
      extents,
      exitRule,
    );
    const liquidityOfferHandle = await zoe.escrowOffer(
      liquidityOfferRules,
      harden([undefined, undefined, newPayment]),
    );
    // Reallocate, giving the liquidity tokens to the user, adding the
    // user's liquidity to the pool, and setting the liquidity offer
    // extents to empty.
    zoe.reallocate(
      harden([offerHandle, poolOfferHandle, liquidityOfferHandle]),
      harden([newPlayerExtents, newPoolExtents, zoe.makeEmptyExtents()]),
    );
    // The newly created liquidityOffer is temporary and is dropped
    zoe.complete(harden([liquidityOfferHandle, offerHandle]));
    return 'Added liquidity.';
  };

  const removeLiquidity = async escrowReceipt => {
    const {
      offerHandle,
      offerRules: { payoutRules },
    } = await zoe.burnEscrowReceipt(escrowReceipt);
    const extentOpsArray = zoe.getExtentOpsArray();

    const kinds = ['wantAtLeast', 'wantAtLeast', 'offerExactly'];
    if (!hasValidPayoutRules(kinds, assays, payoutRules)) {
      return rejectOffer(
        zoe,
        offerHandle,
        'The offer to remove liquidity was invalid',
      );
    }
    const offerHandles = harden([poolOfferHandle, offerHandle]);
    const [poolExtents, playerExtents] = zoe.getExtentsFor(offerHandles);
    const liquidityTokenIn = playerExtents[2];

    const newPlayerExtents = poolExtents.map(poolE =>
      divide(multiply(liquidityTokenIn, poolE), liqTokenSupply),
    );

    const newPoolExtents = vectorWith(
      extentOpsArray,
      vectorWithout(extentOpsArray, poolExtents, newPlayerExtents),
      [0, 0, liquidityTokenIn],
    );

    liqTokenSupply -= liquidityTokenIn;

    zoe.reallocate(
      harden([offerHandle, poolOfferHandle]),
      harden([newPlayerExtents, newPoolExtents]),
    );
    zoe.complete(harden([offerHandle]));
    return 'Liquidity successfully removed.';
  };

  /**
   * `calculateSwap` contains the logic for calculating how many
   * tokens should be given back to the user in exchange for what they
   * sent in. It also calculates the fee as well as the new extents of
   * the assets in the pool. `calculateSwap` is reused in several
   * different places, including to check whether an offer is valid,
   * getting the current price for an asset on user request, and to do
   * the actual reallocation after an offer has been made. The `E` in
   * variable names stands for extent.
   * @param  {number} tokenInPoolE - the extent in the liquidity pool
   * of the kind of token that was sent in.
   * @param  {number} tokenOutPoolE - the extent in the liquidity pool
   * of the other kind of token, the kind that will be sent out.
   * @param  {number} tokenInE - the extent that was sent in to be
   * exchanged
   * @param  {number} feeInTenthOfPercent=3 - the fee taken in tenths
   * of a percent. The default is 0.3%. The fee is taken in terms of
   * tokenIn, which is the kind that was sent in.
   */
  const calculateSwap = (
    tokenInPoolE,
    tokenOutPoolE,
    tokenInE,
    feeInTenthOfPercent = 3,
  ) => {
    // Constant product invariant means:
    // tokenInPoolE * tokenOutPoolE =
    //   (tokenInPoolE + tokenInE) *
    //   (tokenOutPoolE - tokensOutE)

    // newTokenInPoolE = tokenInPoolE + tokenInE;
    const newTokenInPoolE = add(tokenInPoolE, tokenInE);

    // newTokenOutPool = tokenOutPool / (1 + (tokenInE/tokenInPoolE)*(1-.003))

    // the order in which we do this makes a difference because of
    // rounding to floor.
    const numerator = multiply(multiply(tokenOutPoolE, tokenInPoolE), 1000);
    const denominator = add(
      multiply(tokenInPoolE, 1000),
      multiply(tokenInE, subtract(1000, feeInTenthOfPercent)),
    );
    // save divide for last
    const newTokenOutPoolE = divide(numerator, denominator);
    return {
      tokenOutE: tokenOutPoolE - newTokenOutPoolE,
      newTokenInPoolE,
      newTokenOutPoolE,
    };
  };

  const unitsToExtentsArray = (extentOps, unitsArray) =>
    unitsArray.map((units, i) =>
      units === undefined ? extentOps[i].empty() : units.extent,
    );

  /**
   * `getPrice` calculates the result of a trade, given a certain units
   * of tokens in.
   */
  const getPrice = unitsIn => {
    const [poolExtents] = zoe.getExtentsFor(harden([poolOfferHandle]));
    const extentOpsArray = zoe.getExtentOpsArray();
    const [tokenAPoolE, tokenBPoolE] = poolExtents;
    const labels = zoe.getLabels();
    const [tokenAInE, tokenBInE] = unitsToExtentsArray(extentOpsArray, unitsIn);

    // offer tokenA, want tokenB
    if (tokenAInE > 0 && tokenBInE === 0) {
      const { tokenOutE } = calculateSwap(tokenAPoolE, tokenBPoolE, tokenAInE);
      return makeUnits(extentOpsArray[1], labels[1], tokenOutE);
    }

    // want tokenA, offer tokenB
    if (tokenAInE === 0 && tokenBInE > 0) {
      const { tokenOutE } = calculateSwap(tokenBPoolE, tokenAPoolE, tokenBInE);
      return makeUnits(extentOpsArray[0], labels[0], tokenOutE);
    }

    throw new Error(`The asset descriptions were invalid`);
  };

  const makeOffer = async escrowReceipt => {
    const {
      offerHandle,
      offerRules: { payoutRules },
    } = await zoe.burnEscrowReceipt(escrowReceipt);
    const successMessage = 'Swap successfully completed.';
    const rejectMessage = 'The offer to swap was invalid.';

    const [poolExtents, playerExtents] = zoe.getExtentsFor(
      harden([poolOfferHandle, offerHandle]),
    );
    const [tokenAPoolE, tokenBPoolE] = poolExtents;

    // offer token A, want token B
    const kindsOfferFirst = ['offerExactly', 'wantAtLeast', 'wantAtLeast'];
    if (hasValidPayoutRules(kindsOfferFirst, assays, payoutRules)) {
      const [tokenInE, wantAtLeastE] = playerExtents;
      const { tokenOutE, newTokenInPoolE, newTokenOutPoolE } = calculateSwap(
        tokenAPoolE,
        tokenBPoolE,
        tokenInE,
      );
      if (tokenOutE < wantAtLeastE) {
        return rejectOffer(zoe, offerHandle, rejectMessage);
      }

      const newPoolExtents = [
        newTokenInPoolE,
        newTokenOutPoolE,
        poolExtents[2],
      ];
      const newPlayerExtents = [0, tokenOutE, 0];

      zoe.reallocate(
        harden([offerHandle, poolOfferHandle]),
        harden([newPlayerExtents, newPoolExtents]),
      );
      zoe.complete(harden([offerHandle]));
      return `${successMessage}`;
    }

    // want token A, offer token B
    const kindsWantFirst = ['wantAtLeast', 'offerExactly', 'wantAtLeast'];
    if (hasValidPayoutRules(kindsWantFirst, assays, payoutRules)) {
      const [wantAtLeastE, tokenInE] = playerExtents;
      const { tokenOutE, newTokenInPoolE, newTokenOutPoolE } = calculateSwap(
        tokenBPoolE,
        tokenAPoolE,
        tokenInE,
      );
      if (tokenOutE < wantAtLeastE) {
        return rejectOffer(zoe, offerHandle, rejectMessage);
      }

      const newPoolExtents = [
        newTokenOutPoolE,
        newTokenInPoolE,
        poolExtents[2],
      ];
      const newPlayerExtents = [tokenOutE, 0, 0];

      zoe.reallocate(
        harden([offerHandle, poolOfferHandle]),
        harden([newPlayerExtents, newPoolExtents]),
      );
      zoe.complete(harden([offerHandle]));
      return `${successMessage}`;
    }

    // Offer must be invalid
    return rejectOffer(zoe, offerHandle, rejectMessage);
  };

  // The API exposed to the user
  const autoswap = harden({
    addLiquidity,
    removeLiquidity,
    getPrice,
    makeOffer,
    getLiquidityAssay: () => liquidityAssay,
    getPoolExtents: () => zoe.getExtentsFor(harden([poolOfferHandle]))[0],
  });
  return harden({
    instance: autoswap,
    assays,
  });
});
