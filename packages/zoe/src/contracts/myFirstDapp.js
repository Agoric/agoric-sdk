/* eslint-disable no-use-before-define */
import harden from '@agoric/harden';
import produceIssuer from '@agoric/ertp';
import { makeHelpers } from './helpers/userFlow';

/**  EDIT THIS CONTRACT WITH YOUR OWN BUSINESS LOGIC */

/**
 * This contract has a similar interface to the autoswap contract, but
 * doesn't do much. The contract assumes that the first offer it
 * receives adds 1 amount of each issuer as liquidity. Then, a user can
 * trade 1 of the first issuer for 1 of the second issuer and vice versa
 * for as long as they want, as long as they alternate the direction
 * of the trade.
 *
 * Please see autoswap.js for the real version of a uniswap implementation.
 */
export const makeContract = harden((zoe, terms) => {
  // The user passes in an array of two issuers for the two kinds of
  // assets to be swapped.
  const startingIssuers = terms.issuers;

  // There is also a third issuer, the issuer for the liquidity token,
  // which is created in this contract. We will return all three as
  // the canonical array of issuers for this contract

  // TODO: USE THE LIQUIDITY MINT TO MINT TOKENS
  const { issuer: liquidityIssuer } = produceIssuer('liquidity');
  const issuers = [...startingIssuers, liquidityIssuer];

  return zoe.addIssuers(issuers).then(() => {
    // This handle is used to store the assets in the liquidity pool.
    let poolHandle;

    const amountMathArray = zoe.getAmountMathForIssuers(issuers);
    const { vectorWith, vectorWithout, makeEmptyOffer } = makeHelpers(
      zoe,
      issuers,
    );

    const getPoolAmounts = () => zoe.getOffer(poolHandle).amounts;

    const makeInvite = () => {
      const seat = harden({
        addLiquidity: () => {
          // This contract assumes that the first offer this
          // receives is to add 1 amount of liquidity for both issuers. If we
          // don't do this, this contract will break.
          // TODO: CHECK HERE THAT OFFER IS A VALID LIQUIDITY OFFER

          // This will only happen once so we will just swap the pool
          // extents and the offer extents to put what was offered in the
          // pool.
          const poolAmounts = zoe.getOffer(poolHandle).amounts;
          const userAmounts = zoe.getOffer(inviteHandle).amounts;
          zoe.reallocate(
            harden([poolHandle, inviteHandle]),
            harden([userAmounts, poolAmounts]),
          );
          zoe.complete(harden([inviteHandle]));

          // TODO: MINT LIQUIDITY TOKENS AND REALLOCATE THEM TO THE USER
          // THROUGH ZOE HERE
          return 'Added liquidity.';
        },
        swap: () => {
          const poolAmounts = zoe.getOffer(poolHandle).amounts;
          const userAmounts = zoe.getOffer(inviteHandle).amounts;
          const [firstUserAmounts, secondUserAmounts] = userAmounts;
          const newUserAmounts = [
            amountMathArray[0].make(secondUserAmounts.extent),
            amountMathArray[1].make(firstUserAmounts.extent),
            amountMathArray[2].empty(),
          ];
          // We want to add the thing offered to the pool and give back the
          // other thing
          // TODO: ADD YOUR OWN LOGIC HERE
          const newPoolAmounts = vectorWithout(
            vectorWith(poolAmounts, userAmounts),
            newUserAmounts,
          );
          zoe.reallocate(
            harden([poolHandle, inviteHandle]),
            harden([newPoolAmounts, newUserAmounts]),
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
          getPrice: amountIn => {
            const IN_INDEX = amountIn.label.issuer === issuers[0] ? 0 : 1;
            const OUT_INDEX = 1 - IN_INDEX;
            return amountMathArray[OUT_INDEX].make(1);
          },
          getLiquidityIssuer: () => liquidityIssuer,
          getPoolAmounts,
          makeInvite,
        },
        terms: { issuers },
      });
    });
  });
});
