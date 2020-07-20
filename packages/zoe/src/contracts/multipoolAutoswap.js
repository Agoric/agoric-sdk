/* global harden */
// @ts-check

/* eslint-disable no-use-before-define */
import makeIssuerKit from '@agoric/ertp';
import { assert, details } from '@agoric/assert';

import { makeTable, makeValidateProperties } from '../table';
import { assertKeywordName } from '../cleanProposal';
import {
  makeZoeHelpers,
  getInputPrice,
  calcLiqValueToMint,
  calcValueToRemove,
} from '../contractSupport';
import { filterObj } from '../objArrayConversion';

/**
 * Autoswap is a rewrite of Uniswap. Please see the documentation for more
 * https://agoric.com/documentation/zoe/guide/contracts/autoswap.html
 *
 * We expect that this contract will have tens to hundreds of issuers.
 * Each liquidity pool is between the central token and a secondary
 * token. Secondary tokens can be exchanged with each other, but only
 * through the central token. For example, if X and Y are two token
 * types and C is the central token, a swap giving X and wanting Y
 * would first use the pool (X, C) then the pool (Y, C). There are no
 * liquidity pools between two secondary tokens.
 *
 * There should only need to be one instance of this contract, so liquidity can
 * be shared as much as possible.
 *
 * When the contract is instantiated, the central token is specified in the
 * issuerKeywordRecord. The party that calls makeInstance gets an invitation
 * that can be used to request an invitation to add liquidity. The same
 * invitation is available by calling `publicAPI.getLiquidityIssuer(brand)`.
 * Separate invitations are available for adding and removing liquidity, and for
 * making trades. Other API operations support monitoring prices and the sizes
 * of pools.
 *
 * @typedef {import('@agoric/ertp/src/issuer').Amount} Amount
 * @typedef {import('@agoric/ertp/src/issuer').Brand} Brand
 * @typedef {import('../zoe').AmountKeywordRecords} AmountKeywordRecords
 * @typedef {import('../zoe').ContractFacet} ContractFacet
 * @param {ContractFacet} zcf
 */
const makeContract = zcf => {
  // This contract must have a "central token" issuer in the terms.
  const CENTRAL_TOKEN = 'CentralToken';

  const getCentralTokenBrand = () => {
    const { brandKeywordRecord } = zcf.getInstanceRecord();
    assert(
      brandKeywordRecord.CentralToken !== undefined,
      details`centralTokenBrand must be present`,
    );
    return brandKeywordRecord.CentralToken;
  };
  const centralTokenBrand = getCentralTokenBrand();

  const {
    trade,
    rejectOffer,
    makeEmptyOffer,
    checkHook,
    assertKeywords,
    escrowAndAllocateTo,
    assertNatMathHelpers,
  } = makeZoeHelpers(zcf);

  // There must be one keyword at the start, which is equal to the
  // value of CENTRAL_TOKEN
  assertKeywords([CENTRAL_TOKEN]);

  // We need to be able to retrieve information about the liquidity
  // pools by tokenBrand. Key: tokenBrand Columns: poolHandle,
  // tokenIssuer, liquidityMint, liquidityIssuer, tokenKeyword,
  // liquidityKeyword, liquidityTokenSupply
  const liquidityTable = makeTable(
    makeValidateProperties(
      harden([
        'poolHandle',
        'tokenIssuer',
        'tokenBrand',
        'liquidityMint',
        'liquidityIssuer',
        'liquidityBrand',
        'tokenKeyword',
        'liquidityKeyword',
        'liquidityTokenSupply',
      ]),
    ),
    'tokenBrand',
  );

  // Allows users to add new liquidity pools. `newTokenIssuer` and
  // `newTokenKeyword` must not have been already used
  const addPool = (newTokenIssuer, newTokenKeyword) => {
    assertKeywordName(newTokenKeyword);
    const { brandKeywordRecord } = zcf.getInstanceRecord();
    const keywords = Object.keys(brandKeywordRecord);
    const brands = Object.values(brandKeywordRecord);
    assert(
      !keywords.includes(newTokenKeyword),
      details`newTokenKeyword must be unique`,
    );
    // TODO: handle newTokenIssuer as a potential promise
    assert(
      !brands.includes(newTokenIssuer.brand),
      details`newTokenIssuer must not be already present`,
    );
    const newLiquidityKeyword = `${newTokenKeyword}Liquidity`;
    assert(
      !keywords.includes(newLiquidityKeyword),
      details`newLiquidityKeyword must be unique`,
    );
    const {
      mint: liquidityMint,
      issuer: liquidityIssuer,
      brand: liquidityBrand,
    } = makeIssuerKit(newLiquidityKeyword);
    return Promise.all([
      zcf.addNewIssuer(newTokenIssuer, newTokenKeyword),
      makeEmptyOffer(),
      zcf.addNewIssuer(liquidityIssuer, newLiquidityKeyword),
    ]).then(([newTokenIssuerRecord, poolHandle]) => {
      // The final element of the above array is intentionally
      // ignored, since we already have the liquidityIssuer and mint.
      assertNatMathHelpers(newTokenIssuerRecord.brand);
      liquidityTable.create(
        harden({
          poolHandle,
          tokenIssuer: newTokenIssuer,
          tokenBrand: newTokenIssuerRecord.brand,
          liquidityMint,
          liquidityIssuer,
          liquidityBrand,
          tokenKeyword: newTokenKeyword,
          liquidityKeyword: newLiquidityKeyword,
          liquidityTokenSupply: 0,
        }),
        newTokenIssuerRecord.brand,
      );
      return harden({
        tokenIssuer: newTokenIssuer,
        tokenBrand: newTokenIssuerRecord.brand,
        liquidityIssuer,
        liquidityBrand,
        tokenKeyword: newTokenKeyword,
        liquidityKeyword: newLiquidityKeyword,
      });
    });
  };

  // The secondary token brand is used as the key of liquidityTable
  // rows, and we use it to look up the pool allocation. We only
  // return the keywords for the secondary token, the central token,
  // and the associated liquidity token.
  const getPoolAllocation = tokenBrand => {
    const { poolHandle, tokenKeyword, liquidityKeyword } = liquidityTable.get(
      tokenBrand,
    );

    const brandKeywordRecord = filterObj(
      zcf.getInstanceRecord().brandKeywordRecord,
      [tokenKeyword, CENTRAL_TOKEN, liquidityKeyword],
    );

    return zcf.getCurrentAllocation(poolHandle, brandKeywordRecord);
  };

  const findSecondaryTokenBrand = ({
    brandIn,
    brandOut,
    offerHandleToReject,
  }) => {
    if (liquidityTable.has(brandIn)) {
      return brandIn;
    }
    if (liquidityTable.has(brandOut)) {
      return brandOut;
    }
    // We couldn't find either so throw. Reject the offer if
    // offerHandleToReject is defined.
    const msg = `No secondary token was found`;
    if (offerHandleToReject !== undefined) {
      rejectOffer(offerHandleToReject, msg);
    }
    throw new Error(msg);
  };

  const getPoolKeyword = brandToMatch => {
    if (brandToMatch === centralTokenBrand) {
      return CENTRAL_TOKEN;
    }
    if (!liquidityTable.has(brandToMatch)) {
      throw new Error('getPoolKeyword: brand not found');
    }
    const { tokenKeyword } = liquidityTable.get(brandToMatch);
    return tokenKeyword;
  };

  const getPoolAmount = (poolAllocation, desiredBrand) => {
    const keyword = getPoolKeyword(desiredBrand);
    return poolAllocation[keyword];
  };

  const doGetCurrentPrice = ({ amountIn, brandOut }) => {
    const brandIn = amountIn.brand;
    const secondaryTokenBrand = findSecondaryTokenBrand({
      brandIn,
      brandOut,
    });
    const poolAllocation = getPoolAllocation(secondaryTokenBrand);
    const outputValue = getInputPrice({
      inputValue: amountIn.value,
      inputReserve: getPoolAmount(poolAllocation, brandIn).value,
      outputReserve: getPoolAmount(poolAllocation, brandOut).value,
    });
    return zcf.getAmountMath(brandOut).make(outputValue);
  };

  const rejectIfNotTokenBrand = (inviteHandle, brand) => {
    if (!liquidityTable.has(brand)) {
      rejectOffer(inviteHandle, `brand ${brand} was not recognized`);
    }
  };

  const addLiquidityExpected = harden({
    give: {
      CentralToken: null,
      SecondaryToken: null,
    },
    want: { Liquidity: null },
  });

  const addLiquidityHook = offerHandle => {
    // Get the brand of the secondary token so we can identify the liquidity pool.
    const {
      proposal: {
        give: {
          SecondaryToken: { brand: secondaryTokenBrand },
        },
      },
    } = zcf.getOffer(offerHandle);

    const {
      tokenKeyword,
      liquidityBrand,
      liquidityTokenSupply,
      liquidityMint,
      poolHandle,
    } = liquidityTable.get(secondaryTokenBrand);

    const userAllocation = zcf.getCurrentAllocation(offerHandle);
    const poolAllocation = getPoolAllocation(secondaryTokenBrand);

    // Calculate how many liquidity tokens we should be minting.
    const liquidityValueOut = calcLiqValueToMint(
      harden({
        liqTokenSupply: liquidityTokenSupply,
        inputValue: userAllocation.CentralToken.value,
        inputReserve: poolAllocation.CentralToken.value,
      }),
    );

    const liquidityAmountOut = zcf
      .getAmountMath(liquidityBrand)
      .make(liquidityValueOut);

    const liquidityPaymentP = liquidityMint.mintPayment(liquidityAmountOut);

    // We update the liquidityTokenSupply before the next turn
    liquidityTable.update(secondaryTokenBrand, {
      liquidityTokenSupply: liquidityTokenSupply + liquidityValueOut,
    });

    // The contract needs to escrow the liquidity payment with Zoe
    // to eventually payout to the user
    return escrowAndAllocateTo({
      amount: liquidityAmountOut,
      payment: liquidityPaymentP,
      keyword: 'Liquidity',
      recipientHandle: offerHandle,
    }).then(() => {
      trade(
        {
          offerHandle: poolHandle,
          gains: {
            CentralToken: userAllocation.CentralToken,
            [tokenKeyword]: userAllocation.SecondaryToken,
          },
        },
        // We reallocated liquidity in the call to
        // escrowAndAllocateTo.
        { offerHandle, gains: {}, losses: userAllocation },
      );

      zcf.complete(harden([offerHandle]));
      return 'Added liquidity.';
    });
  };

  const removeLiquidityExpected = harden({
    want: {
      CentralToken: null,
      SecondaryToken: null,
    },
    give: {
      Liquidity: null,
    },
  });

  const removeLiquidityHook = offerHandle => {
    // Get the brand of the secondary token so we can identify the liquidity pool.
    const {
      proposal: {
        want: {
          SecondaryToken: { brand: secondaryTokenBrand },
        },
      },
    } = zcf.getOffer(offerHandle);

    const {
      tokenKeyword,
      liquidityKeyword,
      liquidityTokenSupply,
      poolHandle,
    } = liquidityTable.get(secondaryTokenBrand);

    const userAllocation = zcf.getCurrentAllocation(offerHandle);
    const poolAllocation = getPoolAllocation(secondaryTokenBrand);
    const liquidityValueIn = userAllocation.Liquidity.value;

    const centralTokenAmountOut = zcf.getAmountMath(centralTokenBrand).make(
      calcValueToRemove(
        harden({
          liqTokenSupply: liquidityTokenSupply,
          poolValue: poolAllocation[CENTRAL_TOKEN].value,
          liquidityValueIn,
        }),
      ),
    );

    const tokenKeywordAmountOut = zcf.getAmountMath(secondaryTokenBrand).make(
      calcValueToRemove(
        harden({
          liqTokenSupply: liquidityTokenSupply,
          poolValue: poolAllocation[tokenKeyword].value,
          liquidityValueIn,
        }),
      ),
    );

    liquidityTable.update(secondaryTokenBrand, {
      liquidityTokenSupply: liquidityTokenSupply - liquidityValueIn,
    });

    trade(
      {
        offerHandle: poolHandle,
        gains: { [liquidityKeyword]: userAllocation.Liquidity },
        losses: {
          CentralToken: centralTokenAmountOut,
          [tokenKeyword]: tokenKeywordAmountOut,
        },
      },
      {
        offerHandle,
        gains: {
          CentralToken: centralTokenAmountOut,
          SecondaryToken: tokenKeywordAmountOut,
        },
        losses: {
          Liquidity: userAllocation.Liquidity,
        },
      },
    );

    zcf.complete(harden([offerHandle]));
    return 'Liquidity successfully removed.';
  };

  const swapExpected = harden({
    give: {
      In: null,
    },
    want: {
      Out: null,
    },
  });

  const swapHook = offerHandle => {
    const {
      give: { In: amountIn },
      want: { Out: wantedAmountOut },
    } = zcf.getOffer(offerHandle).proposal;
    const brandIn = amountIn.brand;
    const brandOut = wantedAmountOut.brand;

    // we could be swapping (1) secondary to secondary, (2) central
    // to secondary, or (3) secondary to central.

    // 1) secondary to secondary
    if (liquidityTable.has(brandIn) && liquidityTable.has(brandOut)) {
      rejectIfNotTokenBrand(offerHandle, brandIn);
      rejectIfNotTokenBrand(offerHandle, brandOut);

      const centralTokenAmount = doGetCurrentPrice(
        harden({
          amountIn,
          brandOut: centralTokenBrand,
        }),
      );
      const amountOut = doGetCurrentPrice(
        harden({
          amountIn: centralTokenAmount,
          brandOut,
        }),
      );

      const brandInAmountMath = zcf.getAmountMath(brandIn);
      const finalUserAmounts = harden({
        In: brandInAmountMath.getEmpty(),
        Out: amountOut,
      });

      const { poolHandle: poolHandleA } = liquidityTable.get(brandIn);
      const poolAllocationA = zcf.getCurrentAllocation(poolHandleA);
      const poolKeywordBrandIn = getPoolKeyword(brandIn);
      const centralTokenAmountMath = zcf.getAmountMath(centralTokenBrand);
      const finalPoolAmountsA = {
        [poolKeywordBrandIn]: brandInAmountMath.add(
          poolAllocationA[poolKeywordBrandIn],
          amountIn,
        ),
        CentralToken: centralTokenAmountMath.subtract(
          poolAllocationA.CentralToken,
          centralTokenAmount,
        ),
      };

      const { poolHandle: poolHandleB } = liquidityTable.get(brandOut);
      const poolAllocationB = zcf.getCurrentAllocation(poolHandleB);
      const poolKeywordBrandOut = getPoolKeyword(brandOut);
      const brandOutAmountMath = zcf.getAmountMath(brandOut);
      const finalPoolAmountsB = {
        CentralToken: centralTokenAmountMath.add(
          poolAllocationB.CentralToken,
          centralTokenAmount,
        ),
        [poolKeywordBrandOut]: brandOutAmountMath.subtract(
          poolAllocationB[poolKeywordBrandOut],
          amountOut,
        ),
      };

      zcf.reallocate(
        harden([poolHandleA, poolHandleB, offerHandle]),
        harden([finalPoolAmountsA, finalPoolAmountsB, finalUserAmounts]),
      );
      zcf.complete(harden([offerHandle]));
      return `Swap successfully completed.`;
    }
    // 2) central to secondary and 3) secondary to central
    const secondaryTokenBrand = findSecondaryTokenBrand({
      brandIn,
      brandOut,
      offerHandleToReject: offerHandle,
    });
    const { poolHandle } = liquidityTable.get(secondaryTokenBrand);

    const amountOut = doGetCurrentPrice(
      harden({
        amountIn,
        brandOut,
      }),
    );
    trade(
      {
        offerHandle: poolHandle,
        gains: {
          [getPoolKeyword(brandIn)]: amountIn,
        },
        losses: {
          [getPoolKeyword(brandOut)]: amountOut,
        },
      },
      {
        offerHandle,
        gains: { Out: amountOut },
        losses: { In: amountIn },
      },
    );
    zcf.complete(harden([offerHandle]));
    return `Swap successfully completed.`;
  };

  /**
   * `getCurrentPrice` calculates the result of a trade, given a certain
   * amount of digital assets in.
   * @param {Amount} amountIn - the amount of digital assets to be
   * sent in
   * @param {Brand} brandOut - the brand of the requested payment.
   */
  const getCurrentPrice = (amountIn, brandOut) => {
    const brandIn = amountIn.brand;
    // brandIn could either be the central token brand, or one of
    // the secondary token brands

    // SecondaryToken to SecondaryToken
    if (brandIn !== centralTokenBrand && brandOut !== centralTokenBrand) {
      assert(
        liquidityTable.has(brandIn) && liquidityTable.has(brandOut),
        details`amountIn brand ${brandIn} or brandOut ${brandOut} was not recognized`,
      );

      // We must do two consecutive `doGetCurrentPrice` calls: from
      // the brandIn to the central token, then from the central
      // token to the brandOut
      const centralTokenAmount = doGetCurrentPrice(
        harden({
          amountIn,
          brandOut: centralTokenBrand,
        }),
      );
      return doGetCurrentPrice(
        harden({
          amountIn: centralTokenAmount,
          brandOut,
        }),
      );
    }

    // All other cases: secondaryToken to CentralToken or vice versa.
    return doGetCurrentPrice(
      harden({
        amountIn,
        brandOut,
      }),
    );
  };

  const getLiquidityIssuer = tokenBrand =>
    liquidityTable.get(tokenBrand).liquidityIssuer;

  const makeAddLiquidityInvite = () =>
    zcf.makeInvitation(
      checkHook(addLiquidityHook, addLiquidityExpected),
      'multipool autoswap add liquidity',
    );

  const makeSwapInvite = () =>
    zcf.makeInvitation(checkHook(swapHook, swapExpected), 'autoswap swap');

  const makeRemoveLiquidityInvite = () =>
    zcf.makeInvitation(
      checkHook(removeLiquidityHook, removeLiquidityExpected),
      'autoswap remove liquidity',
    );

  zcf.initPublicAPI(
    harden({
      addPool,
      getPoolAllocation,
      getLiquidityIssuer,
      getCurrentPrice,
      makeSwapInvite,
      makeAddLiquidityInvite,
      makeRemoveLiquidityInvite,
    }),
  );

  return makeAddLiquidityInvite();
};

harden(makeContract);
export { makeContract };
