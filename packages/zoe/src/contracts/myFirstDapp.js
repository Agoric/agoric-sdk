/* eslint-disable no-use-before-define */
import harden from '@agoric/harden';
import { makeMint } from '@agoric/ertp/core/mint';
import { makeHelpers } from './helpers/userFlow';

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

  return zoe.addNewAssay(liquidityAssay).then(() => {
    // This handle is used to store the assets in the liquidity pool.
    let poolHandle;

    const unitOpsArray = zoe.getUnitOpsForAssays(assays);
    const { vectorWith, vectorWithout, makeEmptyOffer } = makeHelpers(
      zoe,
      assays,
    );

    const getPoolUnits = () => zoe.getOffer(poolHandle).units;

    const makeInvite = () => {
      const seat = harden({
        addLiquidity: () => {
          // This contract assumes that the first offer this
          // receives is to add 1 unit of liquidity for both assays. If we
          // don't do this, this contract will break.
          // TODO: CHECK HERE THAT OFFER IS A VALID LIQUIDITY OFFER

          // This will only happen once so we will just swap the pool
          // extents and the offer extents to put what was offered in the
          // pool.
          const poolUnits = zoe.getOffer(poolHandle).units;
          const userUnits = zoe.getOffer(inviteHandle).units;
          zoe.reallocate(
            harden([poolHandle, inviteHandle]),
            harden([userUnits, poolUnits]),
          );
          zoe.complete(harden([inviteHandle]));

          // TODO: MINT LIQUIDITY TOKENS AND REALLOCATE THEM TO THE USER
          // THROUGH ZOE HERE
          return 'Added liquidity.';
        },
        swap: () => {
          const poolUnits = zoe.getOffer(poolHandle).units;
          const userUnits = zoe.getOffer(inviteHandle).units;
          const [firstUserUnits, secondUserUnits] = userUnits;
          const newUserUnits = [
            unitOpsArray[0].make(secondUserUnits.extent),
            unitOpsArray[1].make(firstUserUnits.extent),
            unitOpsArray[2].empty(),
          ];
          // We want to add the thing offered to the pool and give back the
          // other thing
          // TODO: ADD YOUR OWN LOGIC HERE
          const newPoolUnits = vectorWithout(
            vectorWith(poolUnits, userUnits),
            newUserUnits,
          );
          zoe.reallocate(
            harden([poolHandle, inviteHandle]),
            harden([newPoolUnits, newUserUnits]),
          );
          zoe.complete(harden([inviteHandle]));
          return 'Swap successfully completed.';
        },
        // TODO: IMPLEMENT (see autoswap.js for an example)
        removeLiquidity: () => {},
      });
      const { invite, inviteHandle } = zoe.makeInvite(seat, {
        seatDesc: 'autoswapSeat',
      });
      return invite;
    };

    return makeEmptyOffer().then(handle => {
      poolHandle = handle;

      return harden({
        invite: makeInvite(),
        publicAPI: {
          // The price is always 1. Always.
          // TODO: CHANGE THIS AND CREATE YOUR OWN BONDING CURVE
          getPrice: unitsIn => {
            const IN_INDEX = unitsIn.label.assay === assays[0] ? 0 : 1;
            const OUT_INDEX = 1 - IN_INDEX;
            return unitOpsArray[OUT_INDEX].make(1);
          },
          getLiquidityAssay: () => liquidityAssay,
          getPoolUnits,
          makeInvite,
        },
      });
    });
  });
});
