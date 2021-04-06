// @ts-check

import { E } from '@agoric/eventual-send';
import { offerTo } from '@agoric/zoe/src/contractSupport';
import { assert, q } from '@agoric/assert';
import { amountMath } from '@agoric/ertp';

import { makeDefaultLiquidationStrategy } from './liquidation';
import { makeTracer } from './makeTracer';

// TODO(hibbert): export from autoswap
const AutoswapInsufficientMsg = / is insufficient to buy amountOut /;

const trace = makeTracer('LM');

/**
 * This contract liquidates the minimum amount of vault's collateral necessary
 * to satisfy the debt. It uses AutoSwap's swapOut, which sells no more than
 * necessary. Because it has offer safety, it can refuse the trade. When that
 * happens, we fall back to selling using the default strategy, which currently
 * uses AutoSwap's swapIn instead.
 */

/** @type {ContractStartFn} */
export async function start(zcf) {
  const { autoswap } = zcf.getTerms();

  function makeDebtorHook(runDebt) {
    const runBrand = runDebt.brand;
    return async function debtorHook(debtorSeat) {
      const {
        give: { In: amountIn },
      } = debtorSeat.getProposal();

      trace(`Proposal: ${q(debtorSeat.getProposal())}`);

      const swapInvitation = E(autoswap).makeSwapOutInvitation();

      const liqProposal = harden({
        give: { In: amountIn },
        want: { Out: runDebt },
      });
      trace(`OFFER TO DEBT: `, runDebt.value);

      const { deposited, userSeatPromise: liqSeat } = await offerTo(
        zcf,
        swapInvitation,
        undefined, // The keywords were mapped already
        liqProposal,
        debtorSeat,
      );

      // if swapOut failed for insufficient funds, we'll sell it all
      async function onSwapOutFail(error) {
        const strategy = makeDefaultLiquidationStrategy(autoswap);
        trace(`onSwapoutFail`);
        assert(
          error.message.match(AutoswapInsufficientMsg),
          `unable to liquidate: ${error}`,
        );

        const {
          deposited: sellAllDeposited,
          userSeatPromise: sellAllSeat,
        } = await offerTo(
          zcf,
          strategy.makeInvitation(),
          undefined, // The keywords were mapped already
          strategy.makeProposal(amountIn, amountMath.makeEmpty(runBrand)),
          debtorSeat,
        );
        // await sellAllDeposited, but don't need the value
        await Promise.all([
          E(sellAllSeat).getOfferResult(),
          sellAllDeposited,
        ]).catch(sellAllError => {
          throw Error(`Unable to liquidate ${sellAllError}`);
        });
      }

      // await deposited, but we don't need the value. We'll need it to have
      // resolved in both branches, so can't put it in Promise.all.
      await deposited;
      await E(liqSeat)
        .getOfferResult()
        .catch(onSwapOutFail);
      debtorSeat.exit();
    };
  }

  const creatorFacet = {
    makeDebtorInvitation: runDebt =>
      zcf.makeInvitation(makeDebtorHook(runDebt), 'Liquidate'),
  };

  return harden({ creatorFacet });
}

export function makeLiquidationStrategy(creatorFacet) {
  async function makeInvitation(runDebt) {
    return creatorFacet.makeDebtorInvitation(runDebt);
  }

  function keywordMapping() {
    return harden({
      Collateral: 'In',
      RUN: 'Out',
    });
  }

  function makeProposal(collateral, run) {
    return harden({
      give: { In: collateral },
      want: { Out: amountMath.makeEmptyFromAmount(run) },
    });
  }

  return {
    makeInvitation,
    keywordMapping,
    makeProposal,
  };
}
