import harden from '@agoric/harden';
import Nat from '@agoric/nat';

import { makeMint } from '../../mint';

export const makeContract = harden((zoe, terms) => {
  // Liquidity tokens are a basic fungible token. We need to be able
  // to instantiate a new zoe with 3 starting assays: two for
  // the underlying rights to be swapped, and this liquidityAssay. So
  // we will make the liquidityAssay now and return it to the user
  // along with the `makeAutoSwap` function.
  const liquidityMint = makeMint('liquidity');
  const liquidityAssay = liquidityMint.getAssay();
  let poolOfferId;

  const assays = [...terms.assays, liquidityAssay];
  let liqTokenSupply = 0;

  const ejectPlayer = (
    offerId,
    message = `The offer was invalid. Please check your refund.`,
  ) => {
    zoe.complete(harden([offerId]));
    return Promise.reject(new Error(`${message}`));
  };

  /**
   * These operations should be used for calculations with the
   * extents of basic fungible tokens.
   */
  const operations = harden({
    add: (x, y) => Nat(x + y),
    subtract: (x, y) => Nat(x - y),
    multiply: (x, y) => Nat(x * y),
    divide: (x, y) => Nat(Math.floor(x / y)),
  });
  const { add, subtract, multiply, divide } = operations;

  // Vector addition of two extent arrays
  const vectorWith = (extentOpsArray, leftExtents, rightExtents) =>
    leftExtents.map((leftQ, i) =>
      extentOpsArray[i].with(leftQ, rightExtents[i]),
    );

  // Vector subtraction of two extent arrays
  const vectorWithout = (extentOpsArray, leftExtents, rightExtents) =>
    leftExtents.map((leftQ, i) =>
      extentOpsArray[i].without(leftQ, rightExtents[i]),
    );

  const isValidOfferAddingLiquidity = newOfferDesc =>
    ['offerExactly', 'offerExactly', 'wantAtLeast'].every(
      (rule, i) => rule === newOfferDesc[i].rule,
    );

  const isValidOfferRemovingLiquidity = newOfferDesc =>
    ['wantAtLeast', 'wantAtLeast', 'offerExactly'].every(
      (rule, i) => rule === newOfferDesc[i].rule,
    );

  const isValidOfferSwappingOfferFirst = newOfferDesc =>
    ['offerExactly', 'wantAtLeast', 'wantAtLeast'].every(
      (rule, i) => rule === newOfferDesc[i].rule,
    );

  const isValidOfferSwappingWantFirst = newOfferDesc =>
    ['wantAtLeast', 'offerExactly', 'wantAtLeast'].every(
      (rule, i) => rule === newOfferDesc[i].rule,
    );

  const addLiquidity = async escrowReceipt => {
    const extentOpsArray = zoe.getExtentOpsArray();
    const { id: offerId, conditions } = await zoe.burnEscrowReceipt(
      escrowReceipt,
    );
    const { offerDesc: offerMadeDesc } = conditions;

    // Create an empty offer to represent the extents of the
    // liquidity pool.
    if (poolOfferId === undefined) {
      poolOfferId = zoe.escrowEmptyOffer();
    }

    const successMessage = 'Added liquidity.';
    const rejectMessage = 'The offer to add liquidity was invalid.';

    if (!isValidOfferAddingLiquidity(offerMadeDesc)) {
      return ejectPlayer(offerId, rejectMessage);
    }

    const [oldPoolExtents, playerExtents] = zoe.getExtentsFor(
      harden([poolOfferId, offerId]),
    );

    // Calculate how many liquidity tokens we should be minting.
    // Calculations are based on the extents represented by index 0.
    // If the current supply is zero, start off by just taking the
    // extent at index 0 and using it as the extent for the
    // liquidity token.
    const liquidityQOut =
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
    newPlayerExtents[2] = liquidityQOut;

    // Now we need to mint the liquidity tokens and make sure that the
    // `zoe` knows about them. We will need to create an offer
    // that escrows the liquidity tokens, and then drop the result.
    const newPurse = liquidityMint.mint(liquidityQOut);
    const newPayment = newPurse.withdrawAll();
    liqTokenSupply += liquidityQOut;

    const rules = ['wantAtLeast', 'wantAtLeast', 'offerExactly'];
    const extents = [
      extentOpsArray[0].empty(),
      extentOpsArray[1].empty(),
      liquidityQOut,
    ];
    const exitCondition = {
      kind: 'noExit',
    };
    const liquidityConditions = zoe.makeConditions(
      rules,
      extents,
      exitCondition,
    );
    const liquidityOfferId = await zoe.escrowOffer(
      liquidityConditions,
      harden([undefined, undefined, newPayment]),
    );
    // Reallocate, giving the liquidity tokens to the user, adding the
    // user's liquidity to the pool, and setting the liquidity offer
    // extents to empty.
    zoe.reallocate(
      harden([offerId, poolOfferId, liquidityOfferId]),
      harden([newPlayerExtents, newPoolExtents, zoe.makeEmptyExtents()]),
    );
    // The newly created liquidityOffer is temporary and is dropped
    zoe.complete(harden([liquidityOfferId, offerId]));
    return `${successMessage}`;
  };

  const removeLiquidity = async escrowReceipt => {
    const { id: offerId, conditions } = await zoe.burnEscrowReceipt(
      escrowReceipt,
    );
    const extentOpsArray = zoe.getExtentOpsArray();
    const { offerDesc: offerMadeDesc } = conditions;
    const successMessage = 'Liquidity successfully removed.';
    const rejectMessage = 'The offer to remove liquidity was invalid';

    if (!isValidOfferRemovingLiquidity(offerMadeDesc)) {
      return ejectPlayer(offerId, rejectMessage);
    }
    const offerIds = harden([poolOfferId, offerId]);
    const [poolExtents, playerExtents] = zoe.getExtentsFor(offerIds);
    const liquidityTokenIn = playerExtents[2];

    const newPlayerExtents = poolExtents.map(poolQ =>
      divide(multiply(liquidityTokenIn, poolQ), liqTokenSupply),
    );

    const newPoolExtents = vectorWith(
      extentOpsArray,
      vectorWithout(extentOpsArray, poolExtents, newPlayerExtents),
      [0, 0, liquidityTokenIn],
    );

    liqTokenSupply -= liquidityTokenIn;

    zoe.reallocate(
      harden([offerId, poolOfferId]),
      harden([newPlayerExtents, newPoolExtents]),
    );
    zoe.complete(harden([offerId]));
    return `${successMessage}`;
  };

  /**
   * `calculateSwap` contains the logic for calculating how many tokens
   * should be given back to the user in exchange for what they sent in.
   * It also calculates the fee as well as the new extents of the
   * assets in the pool. `calculateSwapMath` is reused in several different
   * places, including to check whether an offer is valid, getting the
   * current price for an asset on user request, and to do the actual
   * reallocation after an offer has been made. The `Q` in variable
   * names stands for extent.
   * @param  {number} tokenInPoolQ - the extent in the liquidity pool
   * of the kind of token that was sent in.
   * @param  {number} tokenOutPoolQ - the extent in the liquidity pool
   * of the other kind of token, the kind that will be sent out.
   * @param  {number} tokenInQ - the extent that was sent in to be
   * exchanged
   * @param  {number} feeInTenthOfPercent=3 - the fee taken in tenths of
   * a percent. The default is 0.3%. The fee is taken in terms of token
   * A, which is the kind that was sent in.
   */
  const calculateSwap = (
    tokenInPoolQ,
    tokenOutPoolQ,
    tokenInQ,
    feeInTenthOfPercent = 3,
  ) => {
    const feeTokenInQ = multiply(divide(tokenInQ, 1000), feeInTenthOfPercent);
    const invariant = multiply(tokenInPoolQ, tokenOutPoolQ);
    const newTokenInPoolQ = add(tokenInPoolQ, tokenInQ);
    const newTokenOutPoolQ = divide(
      invariant,
      subtract(newTokenInPoolQ, feeTokenInQ),
    );
    const tokenOutQ = subtract(tokenOutPoolQ, newTokenOutPoolQ);

    // Note: We add the fee to the pool extent, but could do something
    // different.
    return {
      tokenOutQ,
      // Since the fee is already added to the pool, this property
      // should only be used to report on fees and test.
      feeQ: feeTokenInQ,
      newTokenInPoolQ: add(newTokenInPoolQ, feeTokenInQ),
      newTokenOutPoolQ,
    };
  };

  const makeAssetDesc = (extentOps, label, allegedExtent) => {
    extentOps.insistKind(allegedExtent);
    return harden({
      label,
      extent: allegedExtent,
    });
  };

  const assetDescsToExtentsArray = (extentOps, assetDescs) =>
    assetDescs.map((assetDesc, i) =>
      assetDesc === undefined ? extentOps[i].empty() : assetDesc.extent,
    );

  /**
   * `getPrice` calculates the result of a trade, given a certain assetDesc
   * of tokens in.
   */
  const getPrice = assetDescIn => {
    const [poolExtents] = zoe.getExtentsFor(harden([poolOfferId]));
    const extentOpsArray = zoe.getExtentOpsArray();
    const [tokenAPoolQ, tokenBPoolQ] = poolExtents;
    const labels = zoe.getLabels();
    const [tokenAInQ, tokenBInQ] = assetDescsToExtentsArray(
      extentOpsArray,
      assetDescIn,
    );

    // offer tokenA, want tokenB
    if (tokenAInQ > 0 && tokenBInQ === 0) {
      const { tokenOutQ } = calculateSwap(tokenAPoolQ, tokenBPoolQ, tokenAInQ);
      return makeAssetDesc(extentOpsArray[1], labels[1], tokenOutQ);
    }

    // want tokenA, offer tokenB
    if (tokenAInQ === 0 && tokenBInQ > 0) {
      const { tokenOutQ } = calculateSwap(tokenBPoolQ, tokenAPoolQ, tokenBInQ);
      return makeAssetDesc(extentOpsArray[0], labels[0], tokenOutQ);
    }

    throw new Error(`The asset descriptions were invalid`);
  };

  const makeOffer = async escrowReceipt => {
    const { id: offerId, conditions } = await zoe.burnEscrowReceipt(
      escrowReceipt,
    );
    const { offerDesc: offerMadeDesc } = conditions;
    const successMessage = 'Swap successfully completed.';
    const rejectMessage = 'The offer to swap was invalid.';

    const [poolExtents, playerExtents] = zoe.getExtentsFor(
      harden([poolOfferId, offerId]),
    );
    const [tokenAPoolQ, tokenBPoolQ] = poolExtents;

    // offer token A, want token B
    if (isValidOfferSwappingOfferFirst(offerMadeDesc)) {
      const [tokenInQ, wantAtLeastQ] = playerExtents;
      const { tokenOutQ, newTokenInPoolQ, newTokenOutPoolQ } = calculateSwap(
        tokenAPoolQ,
        tokenBPoolQ,
        tokenInQ,
      );
      if (tokenOutQ < wantAtLeastQ) {
        return ejectPlayer(offerId, rejectMessage);
      }

      const newPoolExtents = [
        newTokenInPoolQ,
        newTokenOutPoolQ,
        poolExtents[2],
      ];
      const newPlayerExtents = [0, tokenOutQ, 0];

      zoe.reallocate(
        harden([offerId, poolOfferId]),
        harden([newPlayerExtents, newPoolExtents]),
      );
      zoe.complete(harden([offerId]));
      return `${successMessage}`;
    }

    // want token A, offer token B
    if (isValidOfferSwappingWantFirst(offerMadeDesc)) {
      const [wantAtLeastQ, tokenInQ] = playerExtents;
      const { tokenOutQ, newTokenInPoolQ, newTokenOutPoolQ } = calculateSwap(
        tokenBPoolQ,
        tokenAPoolQ,
        tokenInQ,
      );
      if (tokenOutQ < wantAtLeastQ) {
        return ejectPlayer(offerId, rejectMessage);
      }

      const newPoolExtents = [
        newTokenOutPoolQ,
        newTokenInPoolQ,
        poolExtents[2],
      ];
      const newPlayerExtents = [tokenOutQ, 0, 0];

      zoe.reallocate(
        harden([offerId, poolOfferId]),
        harden([newPlayerExtents, newPoolExtents]),
      );
      zoe.complete(harden([offerId]));
      return `${successMessage}`;
    }

    // Offer must be invalid
    return ejectPlayer(offerId, rejectMessage);
  };

  // The API exposed to the user
  const autoswap = harden({
    addLiquidity,
    removeLiquidity,
    getPrice,
    makeOffer,
    getLiquidityAssay: () => liquidityAssay,
    getPoolExtents: () => zoe.getExtentsFor(harden([poolOfferId]))[0],
  });
  return harden({
    instance: autoswap,
    assays,
  });
});
