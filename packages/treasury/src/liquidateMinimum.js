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

  function makeDebtorHook(sconeDebt) {
    const sconeBrand = sconeDebt.brand;
    return async function debtorHook(debtorSeat) {
      const {
        give: { In: amountIn },
      } = debtorSeat.getProposal();

      trace(`Proposal: ${q(debtorSeat.getProposal())}`);

      const swapInvitation = E(autoswap).makeSwapOutInvitation();

      const liqProposal = harden({
        give: { In: amountIn },
        want: { Out: sconeDebt },
      });
      trace(`OFFER TO DEBT: `, sconeDebt.value);

      const { deposited, userSeatPromise: liqSeat } = await offerTo(
        zcf,
        swapInvitation,
        undefined,
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
          strategy.keywordMapping(),
          strategy.makeProposal(amountIn, amountMath.makeEmpty(sconeBrand)),
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
    makeDebtorInvitation: sconesDebt =>
      zcf.makeInvitation(makeDebtorHook(sconesDebt), 'liquidate'),
  };

  return harden({ creatorFacet });
}

export function makeLiquidationStrategy(creatorFacet) {
  async function makeInvitation(sconeDebt) {
    return creatorFacet.makeDebtorInvitation(sconeDebt);
  }

  function keywordMapping() {
    return harden({
      Collateral: 'In',
      Scones: 'Out',
    });
  }

  function makeProposal(collateral, scones) {
    return harden({
      give: { In: collateral },
      want: { Out: amountMath.makeEmptyFromAmount(scones) },
    });
  }

  return {
    makeInvitation,
    keywordMapping,
    makeProposal,
  };
}
