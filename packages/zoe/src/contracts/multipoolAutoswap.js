/* eslint-disable no-use-before-define */
import harden from '@agoric/harden';
import produceIssuer from '@agoric/ertp';
import { assert, details } from '@agoric/assert';

import { makeTable, makeValidateProperties } from '../table';
import { assertCapASCII } from '../cleanProposal';
import {
  makeZoeHelpers,
  getCurrentPrice,
  calcLiqExtentToMint,
  calcExtentToRemove,
} from '../contractSupport';

// Autoswap is a rewrite of Uniswap. Please see the documentation for more
// https://agoric.com/documentation/zoe/guide/contracts/autoswap.html

// We expect that this contract will have tens to hundreds of issuers.
// Each liquidity pool is between the central token and a secondary
// token. Secondary tokens can be exchanged with each other, but only
// through the central token. For example, if X and Y are two token
// types and C is the central token, a swap giving X and wanting Y
// would first use the pool (X, C) then the pool (Y, C). There are no
// liquidity pools between two secondary tokens.

export const makeContract = harden(zoe => {
  // This contract must have a "central token" issuer in the terms.
  const CENTRAL_TOKEN = 'CentralToken';

  const getCentralTokenBrand = () => {
    const {
      terms: { CentralToken: centralTokenIssuer },
    } = zoe.getInstanceRecord();
    const { brand: centralTokenBrand } = zoe.getIssuerRecord(
      centralTokenIssuer,
    );
    assert(
      centralTokenBrand !== undefined,
      details`centralTokenBrand must be present`,
    );
    return centralTokenBrand;
  };
  const centralTokenBrand = getCentralTokenBrand();

  const {
    rejectOffer,
    makeEmptyOffer,
    rejectIfNotProposal,
    assertKeywords,
    getKeys,
  } = makeZoeHelpers(zoe);

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
        'liquidityMint',
        'liquidityIssuer',
        'tokenKeyword',
        'liquidityKeyword',
        'liquidityTokenSupply',
      ]),
    ),
  );

  // Allows users to add new liquidity pools. `newTokenIssuer` and
  // `newTokenKeyword` must not have been already used
  const addPool = (newTokenIssuer, newTokenKeyword) => {
    assertCapASCII(newTokenKeyword);
    const { issuerKeywordRecord } = zoe.getInstanceRecord();
    const keywords = Object.keys(issuerKeywordRecord);
    const issuers = Object.values(issuerKeywordRecord);
    assert(
      !keywords.includes(newTokenKeyword),
      details`newTokenKeyword must be unique`,
    );
    // TODO: handle newTokenIssuer as a potential promise
    assert(
      !issuers.includes(newTokenIssuer),
      details`newTokenIssuer must not be already present`,
    );
    const newLiquidityKeyword = `${newTokenKeyword}Liquidity`;
    assert(
      !keywords.includes(newLiquidityKeyword),
      details`newLiquidityKeyword must be unique`,
    );
    const { mint: liquidityMint, issuer: liquidityIssuer } = produceIssuer(
      newLiquidityKeyword,
    );
    return Promise.all([
      zoe.addNewIssuer(newTokenIssuer, newTokenKeyword),
      makeEmptyOffer(),
      zoe.addNewIssuer(liquidityIssuer, newLiquidityKeyword),
    ]).then(([newTokenIssuerRecord, poolHandle]) => {
      // The third element of the above array is intentionally
      // ignored, since we already have the liquidityIssuer and mint.
      const amountMaths = zoe.getAmountMaths(harden([newTokenKeyword]));
      assert(
        amountMaths[newTokenKeyword].getMathHelpersName() === 'nat',
        details`tokenIssuer must have natMathHelpers`,
      );
      liquidityTable.create(
        harden({
          poolHandle,
          tokenIssuer: newTokenIssuer,
          liquidityMint,
          liquidityIssuer,
          tokenKeyword: newTokenKeyword,
          liquidityKeyword: newLiquidityKeyword,
          liquidityTokenSupply: 0,
        }),
        newTokenIssuerRecord.brand,
      );
      return `liquidity pool for ${newTokenKeyword} added`;
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
    return zoe.getCurrentAllocation(
      poolHandle,
      harden([tokenKeyword, CENTRAL_TOKEN, liquidityKeyword]),
    );
  };

  const doGetCurrentPrice = ({
    amountIn,
    keywordIn,
    keywordOut,
    secondaryBrand,
  }) => {
    const poolAmounts = getPoolAllocation(secondaryBrand);
    const { outputExtent } = getCurrentPrice(
      harden({
        inputExtent: amountIn.extent,
        inputReserve: poolAmounts[keywordIn].extent,
        outputReserve: poolAmounts[keywordOut].extent,
      }),
    );
    const amountMaths = zoe.getAmountMaths(harden([keywordOut]));
    return amountMaths[keywordOut].make(outputExtent);
  };

  const doSwap = ({
    userAllocation,
    keywordIn,
    keywordOut,
    secondaryBrand,
  }) => {
    const { poolHandle } = liquidityTable.get(secondaryBrand);
    const poolAllocation = getPoolAllocation(secondaryBrand);
    const { outputExtent, newInputReserve, newOutputReserve } = getCurrentPrice(
      harden({
        inputExtent: userAllocation[keywordIn].extent,
        inputReserve: poolAllocation[keywordIn].extent,
        outputReserve: poolAllocation[keywordOut].extent,
      }),
    );
    const amountMaths = zoe.getAmountMaths([keywordIn, keywordOut]);
    const amountOut = amountMaths[keywordOut].make(outputExtent);

    const newUserAmounts = harden({
      [keywordIn]: amountMaths[keywordIn].getEmpty(),
      [keywordOut]: amountOut,
    });

    const newPoolAmounts = harden({
      [keywordIn]: amountMaths[keywordIn].make(newInputReserve),
      [keywordOut]: amountMaths[keywordOut].make(newOutputReserve),
    });

    return harden({ poolHandle, newUserAmounts, newPoolAmounts });
  };

  const getSecondaryBrand = ({ offerHandle, isAddLiquidity }) => {
    const { proposal } = zoe.getOffer(offerHandle);
    const key = isAddLiquidity ? 'give' : 'want';
    const {
      // eslint-disable-next-line no-unused-vars
      [key]: { [CENTRAL_TOKEN]: centralAmount, ...tokenAmountKeywordRecord },
    } = proposal;
    const values = Object.values(tokenAmountKeywordRecord);
    if (values.length !== 1) {
      rejectOffer(offerHandle, `only one secondary brand should be present`);
    }
    return values[0].brand;
  };

  const makeAdd = amountMaths => (key, obj1, obj2) =>
    amountMaths[key].add(obj1[key], obj2[key]);

  const makeSubtract = amountMaths => (key, obj1, obj2) =>
    amountMaths[key].subtract(obj1[key], obj2[key]);

  const makeGetAllEmpty = amountMaths => keywords => {
    const newObj = {};
    keywords.forEach(
      keyword => (newObj[keyword] = amountMaths[keyword].getEmpty()),
    );
    // intentionally not hardened
    return newObj;
  };

  const rejectIfNotTokenBrand = (inviteHandle, brand) => {
    if (!liquidityTable.has(brand)) {
      rejectOffer(inviteHandle, `brand ${brand} was not recognized`);
    }
  };

  const addLiquidity = offerHandle => {
    // Get the brand of the secondary token so we can identify the liquidity pool.
    const secondaryTokenBrand = getSecondaryBrand(
      harden({
        offerHandle,
        isAddLiquidity: true,
      }),
    );

    const {
      tokenKeyword,
      liquidityKeyword,
      liquidityTokenSupply,
      liquidityMint,
      poolHandle,
    } = liquidityTable.get(secondaryTokenBrand);

    // These are the keywords that will be used several times within this method
    const liquidityKeys = harden([
      CENTRAL_TOKEN,
      tokenKeyword,
      liquidityKeyword,
    ]);

    const expected = harden({
      give: {
        [CENTRAL_TOKEN]: null,
        [tokenKeyword]: null,
      },
      want: { [liquidityKeyword]: null },
    });
    rejectIfNotProposal(offerHandle, expected);

    const userAmounts = zoe.getCurrentAllocation(offerHandle, liquidityKeys);
    const poolAmounts = getPoolAllocation(secondaryTokenBrand);

    // Calculate how many liquidity tokens we should be minting.
    const liquidityExtentOut = calcLiqExtentToMint(
      harden({
        liquidityTokenSupply,
        inputExtent: userAmounts[CENTRAL_TOKEN].extent,
        inputReserve: poolAmounts[CENTRAL_TOKEN].extent,
      }),
    );
    const amountMaths = zoe.getAmountMaths(liquidityKeys);

    const liquidityAmountOut = amountMaths[liquidityKeyword].make(
      liquidityExtentOut,
    );

    const liquidityPaymentP = liquidityMint.mintPayment(liquidityAmountOut);

    // The contract needs to escrow the liquidity payment with Zoe
    // to eventually pay as a payout to the user
    const tempProposal = harden({
      give: { [liquidityKeyword]: liquidityAmountOut },
    });

    const { inviteHandle: tempLiqHandle, invite } = zoe.makeInvite();
    const zoeService = zoe.getZoeService();
    // We update the liquidityTokenSupply before the next turn
    liquidityTable.update(secondaryTokenBrand, {
      liquidityTokenSupply: liquidityTokenSupply + liquidityExtentOut,
    });
    return zoeService
      .redeem(
        invite,
        tempProposal,
        harden({ [liquidityKeyword]: liquidityPaymentP }),
      )
      .then(() => {
        const add = makeAdd(amountMaths);
        const getAllEmpty = makeGetAllEmpty(amountMaths);
        const newPoolAmounts = harden({
          [CENTRAL_TOKEN]: add(CENTRAL_TOKEN, userAmounts, poolAmounts),
          [tokenKeyword]: add(tokenKeyword, userAmounts, poolAmounts),
          [liquidityKeyword]: poolAmounts[liquidityKeyword],
        });

        const newUserAmounts = getAllEmpty(liquidityKeys);
        newUserAmounts[liquidityKeyword] = liquidityAmountOut;

        const newTempLiqAmounts = getAllEmpty(liquidityKeys);

        zoe.reallocate(
          harden([offerHandle, poolHandle, tempLiqHandle]),
          harden([newUserAmounts, newPoolAmounts, newTempLiqAmounts]),
          liquidityKeys,
        );
        zoe.complete(harden([offerHandle, tempLiqHandle]));
        return 'Added liquidity.';
      });
  };

  const removeLiquidity = offerHandle => {
    const secondaryTokenBrand = getSecondaryBrand(
      harden({ offerHandle, isAddLiquidity: false }),
    );

    const {
      tokenKeyword,
      liquidityKeyword,
      liquidityTokenSupply,
      poolHandle,
    } = liquidityTable.get(secondaryTokenBrand);

    const expected = harden({
      want: { [CENTRAL_TOKEN]: null, [tokenKeyword]: null },
      give: { [liquidityKeyword]: null },
    });
    rejectIfNotProposal(offerHandle, expected);

    const liquidityKeys = harden([
      CENTRAL_TOKEN,
      tokenKeyword,
      liquidityKeyword,
    ]);

    const userAllocation = zoe.getCurrentAllocation(offerHandle, liquidityKeys);
    const poolAllocation = getPoolAllocation(secondaryTokenBrand);
    const liquidityExtentIn = userAllocation[liquidityKeyword].extent;

    const amountMaths = zoe.getAmountMaths(liquidityKeys);

    const subtract = makeSubtract(amountMaths);

    const newUserAmounts = harden({
      [CENTRAL_TOKEN]: amountMaths[CENTRAL_TOKEN].make(
        calcExtentToRemove(
          harden({
            liqTokenSupply: liquidityTokenSupply,
            poolExtent: poolAllocation[CENTRAL_TOKEN].extent,
            liquidityExtentIn,
          }),
        ),
      ),
      [tokenKeyword]: amountMaths[tokenKeyword].make(
        calcExtentToRemove(
          harden({
            liqTokenSupply: liquidityTokenSupply,
            poolExtent: poolAllocation[tokenKeyword].extent,
            liquidityExtentIn,
          }),
        ),
      ),
      [liquidityKeyword]: amountMaths[liquidityKeyword].getEmpty(),
    });

    const newPoolAmounts = harden({
      [CENTRAL_TOKEN]: subtract(CENTRAL_TOKEN, poolAllocation, newUserAmounts),
      [tokenKeyword]: subtract(tokenKeyword, poolAllocation, newUserAmounts),
      [liquidityKeyword]: amountMaths[liquidityKeyword].add(
        poolAllocation[liquidityKeyword],
        amountMaths[liquidityKeyword].make(liquidityExtentIn),
      ),
    });

    liquidityTable.update(secondaryTokenBrand, {
      liquidityTokenSupply: liquidityTokenSupply - liquidityExtentIn,
    });

    zoe.reallocate(
      harden([offerHandle, poolHandle]),
      harden([newUserAmounts, newPoolAmounts]),
      liquidityKeys,
    );
    zoe.complete(harden([offerHandle]));
    return 'Liquidity successfully removed.';
  };

  const swap = offerHandle => {
    const { proposal } = zoe.getOffer(offerHandle);
    const getKeywordAndBrand = amountKeywordRecord => {
      const keywords = getKeys(amountKeywordRecord);
      if (keywords.length !== 1) {
        rejectOffer(
          offerHandle,
          `A swap requires giving one type of token for another, ${keywords.length} tokens were provided.`,
        );
      }
      return harden({
        keyword: keywords[0],
        brand: Object.values(amountKeywordRecord)[0].brand,
      });
    };

    const { keyword: keywordIn, brand: brandIn } = getKeywordAndBrand(
      proposal.give,
    );
    const { keyword: keywordOut, brand: brandOut } = getKeywordAndBrand(
      proposal.want,
    );

    const expected = harden({
      give: { [keywordIn]: null },
      want: { [keywordOut]: null },
    });
    rejectIfNotProposal(offerHandle, expected);

    // we could be swapping (1) central to secondary, (2) secondary to central, or (3) secondary to secondary.

    // 1) central to secondary
    if (brandIn === centralTokenBrand) {
      rejectIfNotTokenBrand(offerHandle, brandOut);

      const keywords = harden([keywordIn, keywordOut]);
      const { poolHandle, newUserAmounts, newPoolAmounts } = doSwap(
        harden({
          userAllocation: zoe.getCurrentAllocation(offerHandle, keywords),
          keywordIn,
          keywordOut,
          secondaryBrand: brandOut,
        }),
      );
      zoe.reallocate(
        harden([offerHandle, poolHandle]),
        harden([newUserAmounts, newPoolAmounts]),
        keywords,
      );
      zoe.complete(harden([offerHandle]));
      return `Swap successfully completed.`;

      // eslint-disable-next-line no-else-return
    } else if (brandOut === centralTokenBrand) {
      // 2) secondary to central
      rejectIfNotTokenBrand(offerHandle, brandIn);
      const keywords = harden([keywordIn, keywordOut]);
      const { poolHandle, newUserAmounts, newPoolAmounts } = doSwap(
        harden({
          userAllocation: zoe.getCurrentAllocation(offerHandle, keywords),
          keywordIn,
          keywordOut,
          secondaryBrand: brandIn,
        }),
      );
      zoe.reallocate(
        harden([offerHandle, poolHandle]),
        harden([newUserAmounts, newPoolAmounts]),
        keywords,
      );
      zoe.complete(harden([offerHandle]));
      return `Swap successfully completed.`;
    } else {
      // 3) secondary to secondary
      rejectIfNotTokenBrand(offerHandle, brandIn);
      rejectIfNotTokenBrand(offerHandle, brandOut);

      const {
        poolHandle: poolHandleA,
        newUserAmounts: newUserAmountsA,
        newPoolAmounts: newPoolAmountsA,
      } = doSwap(
        harden({
          userAllocation: zoe.getCurrentAllocation(
            offerHandle,
            harden([keywordIn, CENTRAL_TOKEN]),
          ),
          keywordIn,
          keywordOut: CENTRAL_TOKEN,
          secondaryBrand: brandIn,
        }),
      );
      const {
        poolHandle: poolHandleB,
        newUserAmounts,
        newPoolAmounts: newPoolAmountsB,
      } = doSwap(
        harden({
          userAllocation: newUserAmountsA,
          keywordIn: CENTRAL_TOKEN,
          keywordOut,
          secondaryBrand: brandOut,
        }),
      );
      const keywords = harden([keywordIn, keywordOut, CENTRAL_TOKEN]);
      const amountMaths = zoe.getAmountMaths(keywords);
      const finalPoolAmountsA = {
        ...newPoolAmountsA,
        [keywordOut]: amountMaths[keywordOut].getEmpty(),
      };
      const finalPoolAmountsB = {
        ...newPoolAmountsB,
        [keywordIn]: amountMaths[keywordIn].getEmpty(),
      };
      const finalUserAmounts = {
        ...newUserAmounts,
        [keywordIn]: newUserAmountsA[keywordIn],
      };
      zoe.reallocate(
        harden([poolHandleA, poolHandleB, offerHandle]),
        harden([finalPoolAmountsA, finalPoolAmountsB, finalUserAmounts]),
        keywords,
      );
      zoe.complete(harden([offerHandle]));
      return `Swap successfully completed.`;
    }
  };

  const makeInvite = () => {
    const seat = harden({
      addLiquidity: () => addLiquidity(inviteHandle),
      removeLiquidity: () => removeLiquidity(inviteHandle),
      swap: () => swap(inviteHandle),
    });
    const { invite, inviteHandle } = zoe.makeInvite(seat, {
      seatDesc: 'autoswapSeat',
    });
    return invite;
  };

  return harden({
    invite: makeInvite(),
    publicAPI: {
      getBrandKeywordRecord: () => {
        const { issuerKeywordRecord } = zoe.getInstanceRecord();
        const brandKeywordRecord = {};
        Object.entries(issuerKeywordRecord).forEach(([keyword, issuer]) => {
          const { brand } = zoe.getIssuerRecord(issuer);
          brandKeywordRecord[keyword] = brand;
        });
        return harden(brandKeywordRecord);
      },
      getKeywordForBrand: brand => {
        assert(
          liquidityTable.has(brand),
          details`There is no pool for this brand. To create a pool, call 'addPool'`,
        );
        return liquidityTable.get(brand).tokenKeyword;
      },
      addPool,
      getPoolAllocation,
      getLiquidityIssuer: tokenBrand =>
        liquidityTable.get(tokenBrand).liquidityIssuer,
      makeInvite,
      /**
       * `getCurrentPrice` calculates the result of a trade, given a certain
       * amount of digital assets in.
       * @param {object} amountIn - the amount of digital assets to be
       * sent in
       */
      getCurrentPrice: (amountIn, brandOut) => {
        const brandIn = amountIn.brand;
        // brandIn could either be the central token brand, or one of
        // the secondary token brands

        // CentralToken to SecondaryToken
        if (brandIn === centralTokenBrand) {
          assert(
            liquidityTable.has(brandOut),
            details`brandOut ${brandOut} was not recognized`,
          );
          return doGetCurrentPrice(
            harden({
              amountIn,
              keywordIn: CENTRAL_TOKEN,
              keywordOut: liquidityTable.get(brandOut).tokenKeyword,
              secondaryBrand: brandOut,
            }),
          );
          // eslint-disable-next-line no-else-return
        } else if (brandOut === centralTokenBrand) {
          // SecondaryToken to CentralToken
          assert(
            liquidityTable.has(brandIn),
            details`amountIn brand ${amountIn} was not recognized`,
          );
          return doGetCurrentPrice(
            harden({
              amountIn,
              keywordIn: liquidityTable.get(brandIn).tokenKeyword,
              keywordOut: CENTRAL_TOKEN,
              secondaryBrand: brandIn,
            }),
          );
        } else {
          // SecondaryToken to SecondaryToken
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
              keywordIn: liquidityTable.get(brandIn).tokenKeyword,
              keywordOut: CENTRAL_TOKEN,
              secondaryBrand: brandIn,
            }),
          );
          return doGetCurrentPrice(
            harden({
              amountIn: centralTokenAmount,
              keywordIn: CENTRAL_TOKEN,
              keywordOut: liquidityTable.get(brandOut).tokenKeyword,
              secondaryBrand: brandOut,
            }),
          );
        }
      },
    },
  });
});
