// @ts-check

/* eslint-disable no-use-before-define */
import harden from '@agoric/harden';
import produceIssuer from '@agoric/ertp';
import { assert, details } from '@agoric/assert';

import { makeTable, makeValidateProperties } from '../table';
import { assertKeywordName } from '../cleanProposal';
import {
  makeZoeHelpers,
  getCurrentPrice,
  calcLiqExtentToMint,
  calcExtentToRemove,
} from '../contractSupport';

/**
 * @typedef {import('../zoe').ContractFacet} ContractFacet
 * @typedef {import('@agoric/ertp/src/issuer').Amount} Amount
 * @typedef {import('../zoe').AmountKeywordRecords} AmountKeywordRecords
 */

// Autoswap is a rewrite of Uniswap. Please see the documentation for more
// https://agoric.com/documentation/zoe/guide/contracts/autoswap.html

// We expect that this contract will have tens to hundreds of issuers.
// Each liquidity pool is between the central token and a secondary
// token. Secondary tokens can be exchanged with each other, but only
// through the central token. For example, if X and Y are two token
// types and C is the central token, a swap giving X and wanting Y
// would first use the pool (X, C) then the pool (Y, C). There are no
// liquidity pools between two secondary tokens.

export const makeContract = harden(
  /** @param {ContractFacet} zcf */ zcf => {
    // This contract must have a "central token" issuer in the terms.
    const CENTRAL_TOKEN = 'CentralToken';

    function buildAmountMathKeywordRecord(keywords) {
      const { issuerKeywordRecord } = zcf.getInstanceRecord();
      const amountMathKeywordRecord = {};
      keywords.forEach(keyword => {
        const issuer = issuerKeywordRecord[keyword];
        const brand = zcf.getBrandForIssuer(issuer);
        assertNatMathHelpers(brand);
        amountMathKeywordRecord[keyword] = zcf.getAmountMath(brand);
      });
      return amountMathKeywordRecord;
    }

    const getCentralTokenBrand = () => {
      const {
        issuerKeywordRecord: { CentralToken: centralTokenIssuer },
      } = zcf.getInstanceRecord();
      const centralTokenBrand = zcf.getBrandForIssuer(centralTokenIssuer);
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
      assertNatMathHelpers(newTokenIssuer.getBrand());
      assertKeywordName(newTokenKeyword);
      const { issuerKeywordRecord } = zcf.getInstanceRecord();
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
        zcf.addNewIssuer(newTokenIssuer, newTokenKeyword),
        makeEmptyOffer(),
        zcf.addNewIssuer(liquidityIssuer, newLiquidityKeyword),
      ]).then(([newTokenIssuerRecord, poolHandle]) => {
        // The third element of the above array is intentionally
        // ignored, since we already have the liquidityIssuer and mint.
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
      const amountMathKeywordRecord = buildAmountMathKeywordRecord([
        tokenKeyword,
        CENTRAL_TOKEN,
        liquidityKeyword,
      ]);
      return zcf.getCurrentAllocation(poolHandle, amountMathKeywordRecord);
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
      const amountMathOut = zcf.getAmountMath(poolAmounts[keywordOut].brand);
      return amountMathOut.make(outputExtent);
    };

    const doSwap = ({
      userAllocation,
      keywordIn,
      keywordOut,
      secondaryBrand,
    }) => {
      const { poolHandle } = liquidityTable.get(secondaryBrand);
      const poolAllocation = getPoolAllocation(secondaryBrand);
      const {
        outputExtent,
        newInputReserve,
        newOutputReserve,
      } = getCurrentPrice(
        harden({
          inputExtent: userAllocation.In.extent,
          inputReserve: poolAllocation[keywordIn].extent,
          outputReserve: poolAllocation[keywordOut].extent,
        }),
      );
      const amountMathOut = zcf.getAmountMath(poolAllocation[keywordOut].brand);
      const amountMathIn = zcf.getAmountMath(poolAllocation[keywordIn].brand);
      const amountOut = amountMathOut.make(outputExtent);

      const newUserAmounts = harden({
        In: amountMathIn.getEmpty(),
        Out: amountOut,
      });

      const newPoolAmounts = harden({
        [keywordIn]: amountMathIn.make(newInputReserve),
        [keywordOut]: amountMathOut.make(newOutputReserve),
      });

      return harden({ poolHandle, newUserAmounts, newPoolAmounts });
    };

    const getSecondaryBrand = ({ offerHandle, isAddLiquidity }) => {
      const { proposal } = zcf.getOffer(offerHandle);
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

    const addLiquidityHook = offerHandle => {
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
      const userAmounts = zcf.getCurrentAllocation(
        offerHandle,
        buildAmountMathKeywordRecord(liquidityKeys),
      );
      const poolAmounts = getPoolAllocation(secondaryTokenBrand);

      // Calculate how many liquidity tokens we should be minting.
      const liquidityExtentOut = calcLiqExtentToMint(
        harden({
          liqTokenSupply: liquidityTokenSupply,
          inputExtent: userAmounts[CENTRAL_TOKEN].extent,
          inputReserve: poolAmounts[CENTRAL_TOKEN].extent,
        }),
      );
      const amountMaths = buildAmountMathKeywordRecord(liquidityKeys);

      const liquidityAmountOut = amountMaths[liquidityKeyword].make(
        liquidityExtentOut,
      );

      const liquidityPaymentP = liquidityMint.mintPayment(liquidityAmountOut);

      // We update the liquidityTokenSupply before the next turn
      liquidityTable.update(secondaryTokenBrand, {
        liquidityTokenSupply: liquidityTokenSupply + liquidityExtentOut,
      });

      // The contract needs to escrow the liquidity payment with Zoe
      // to eventually pay as a payout to the user
      return escrowAndAllocateTo({
        amount: liquidityAmountOut,
        payment: liquidityPaymentP,
        keyword: liquidityKeyword,
        recipientHandle: offerHandle,
      }).then(() => {
        const add = makeAdd(amountMaths);
        const getAllEmpty = makeGetAllEmpty(amountMaths);
        const newPoolAmounts = harden({
          [CENTRAL_TOKEN]: add(CENTRAL_TOKEN, userAmounts, poolAmounts),
          [tokenKeyword]: add(tokenKeyword, userAmounts, poolAmounts),
          [liquidityKeyword]: poolAmounts[liquidityKeyword],
        });

        const newUserAmounts = getAllEmpty(liquidityKeys);
        newUserAmounts[liquidityKeyword] = liquidityAmountOut;

        zcf.reallocate(
          harden([offerHandle, poolHandle]),
          harden([newUserAmounts, newPoolAmounts]),
        );
        zcf.complete(harden([offerHandle]));
        return 'Added liquidity.';
      });
    };

    const removeLiquidityHook = offerHandle => {
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
      const amountMaths = buildAmountMathKeywordRecord([
        CENTRAL_TOKEN,
        tokenKeyword,
        liquidityKeyword,
      ]);

      const userAllocation = zcf.getCurrentAllocation(offerHandle, amountMaths);
      const poolAllocation = getPoolAllocation(secondaryTokenBrand);
      const liquidityExtentIn = userAllocation[liquidityKeyword].extent;

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
        [CENTRAL_TOKEN]: subtract(
          CENTRAL_TOKEN,
          poolAllocation,
          newUserAmounts,
        ),
        [tokenKeyword]: subtract(tokenKeyword, poolAllocation, newUserAmounts),
        [liquidityKeyword]: amountMaths[liquidityKeyword].add(
          poolAllocation[liquidityKeyword],
          amountMaths[liquidityKeyword].make(liquidityExtentIn),
        ),
      });

      liquidityTable.update(secondaryTokenBrand, {
        liquidityTokenSupply: liquidityTokenSupply - liquidityExtentIn,
      });

      zcf.reallocate(
        harden([offerHandle, poolHandle]),
        harden([newUserAmounts, newPoolAmounts]),
      );
      zcf.complete(harden([offerHandle]));
      return 'Liquidity successfully removed.';
    };

    const swapHook = offerHandle => {
      const {
        give: {
          In: { brand: brandIn },
        },
        want: {
          Out: { brand: brandOut },
        },
      } = zcf.getOffer(offerHandle).proposal;

      const expected = harden({
        give: { In: null },
        want: { Out: null },
      });
      rejectIfNotProposal(offerHandle, expected);

      // we could be swapping (1) central to secondary, (2) secondary to central, or (3) secondary to secondary.

      // 1) central to secondary
      if (brandIn === centralTokenBrand) {
        rejectIfNotTokenBrand(offerHandle, brandOut);

        const { poolHandle, newUserAmounts, newPoolAmounts } = doSwap(
          harden({
            userAllocation: zcf.getCurrentAllocation(offerHandle),
            keywordIn: 'CentralToken',
            keywordOut: liquidityTable.get(brandOut).tokenKeyword,
            secondaryBrand: brandOut,
          }),
        );
        zcf.reallocate(
          harden([offerHandle, poolHandle]),
          harden([newUserAmounts, newPoolAmounts]),
        );
        zcf.complete(harden([offerHandle]));
        return `Swap successfully completed.`;

        // eslint-disable-next-line no-else-return
      } else if (brandOut === centralTokenBrand) {
        // 2) secondary to central
        rejectIfNotTokenBrand(offerHandle, brandIn);
        const { poolHandle, newUserAmounts, newPoolAmounts } = doSwap(
          harden({
            userAllocation: zcf.getCurrentAllocation(offerHandle),
            keywordIn: liquidityTable.get(brandIn).tokenKeyword,
            keywordOut: 'CentralToken',
            secondaryBrand: brandIn,
          }),
        );
        zcf.reallocate(
          harden([offerHandle, poolHandle]),
          harden([newUserAmounts, newPoolAmounts]),
        );
        zcf.complete(harden([offerHandle]));
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
            userAllocation: zcf.getCurrentAllocation(offerHandle),
            keywordIn: liquidityTable.get(brandIn).tokenKeyword,
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
            userAllocation: { In: newUserAmountsA.Out },
            keywordIn: CENTRAL_TOKEN,
            keywordOut: liquidityTable.get(brandOut).tokenKeyword,
            secondaryBrand: brandOut,
          }),
        );
        const amountMathOut = zcf.getAmountMath(brandOut);
        const amountMathIn = zcf.getAmountMath(brandIn);
        const finalPoolAmountsA = {
          ...newPoolAmountsA,
          Out: amountMathOut.getEmpty(),
        };
        const finalPoolAmountsB = {
          ...newPoolAmountsB,
          In: amountMathIn.getEmpty(),
        };
        const finalUserAmounts = {
          ...newUserAmounts,
          In: newUserAmountsA.In,
        };
        zcf.reallocate(
          harden([poolHandleA, poolHandleB, offerHandle]),
          harden([finalPoolAmountsA, finalPoolAmountsB, finalUserAmounts]),
        );
        zcf.complete(harden([offerHandle]));
        return `Swap successfully completed.`;
      }
    };

    const makeAddLiquidityInvite = () =>
      zcf.makeInvitation(addLiquidityHook, 'multipool autoswap add liquidity');

    zcf.initPublicAPI(
      harden({
        getBrandKeywordRecord: () => {
          const { issuerKeywordRecord } = zcf.getInstanceRecord();
          const brandKeywordRecord = {};
          Object.entries(issuerKeywordRecord).forEach(([keyword, issuer]) => {
            brandKeywordRecord[keyword] = zcf.getBrandForIssuer(issuer);
          });
          return harden(brandKeywordRecord);
        },
        // TODO (cth): why does anyone need the keyword?
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
        makeSwapInvite: () => zcf.makeInvitation(swapHook, 'autoswap swap'),
        makeAddLiquidityInvite,
        makeRemoveLiquidityInvite: () =>
          zcf.makeInvitation(removeLiquidityHook, 'autoswap remove liquidity'),
      }),
    );

    return makeAddLiquidityInvite();
  },
);
