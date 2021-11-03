// @ts-check

import { E } from '@agoric/eventual-send';
import { offerTo } from '@agoric/zoe/src/contractSupport/index.js';
import { AmountMath } from '@agoric/ertp';
import { Far } from '@agoric/marshal';

import { makeDefaultLiquidationStrategy } from './liquidation.js';
import { makeTracer } from './makeTracer.js';

const trace = makeTracer('LM');

/**
 * This contract liquidates the minimum amount of vault's collateral necessary
 * to satisfy the debt. It uses AutoSwap's swapOut, which sells no more than
 * necessary. Because it has offer safety, it can refuse the trade. When that
 * happens, we fall back to selling using the default strategy, which currently
 * uses AutoSwap's swapIn instead.
 */

/** @type {ContractStartFn} */
async function start(zcf) {
  const { amm } = zcf.getTerms();

  function makeDebtorHook(runDebt) {
    const runBrand = runDebt.brand;
    return async function debtorHook(debtorSeat) {
      const {
        give: { In: amountIn },
      } = debtorSeat.getProposal();
      const inBefore = debtorSeat.getAmountAllocated('In');

      const swapInvitation = E(amm).makeSwapOutInvitation();
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

      // if swapOut failed to make the trade, we'll sell it all
      async function onSwapOutNoTrade() {
        const strategy = makeDefaultLiquidationStrategy(amm);
        trace(`onSwapoutFail`);

        const {
          deposited: sellAllDeposited,
          userSeatPromise: sellAllSeat,
        } = await offerTo(
          zcf,
          strategy.makeInvitation(runDebt),
          undefined, // The keywords were mapped already
          strategy.makeProposal(amountIn, AmountMath.makeEmpty(runBrand)),
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
      await E(liqSeat).getOfferResult();

      if (AmountMath.isEqual(inBefore, debtorSeat.getAmountAllocated('In'))) {
        trace('trying again because nothing was liquidated');
        await onSwapOutNoTrade();
      }

      debtorSeat.exit();
    };
  }

  const creatorFacet = Far('debtorInvitationCreator', {
    makeDebtorInvitation: runDebt =>
      zcf.makeInvitation(makeDebtorHook(runDebt), 'Liquidate'),
  });

  return harden({ creatorFacet });
}

/** @type {MakeLiquidationStrategy} */
function makeLiquidationStrategy(creatorFacet) {
  async function makeInvitation(runDebt) {
    return E(creatorFacet).makeDebtorInvitation(runDebt);
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
      want: { Out: AmountMath.makeEmptyFromAmount(run) },
    });
  }

  return {
    makeInvitation,
    keywordMapping,
    makeProposal,
  };
}

harden(start);
harden(makeLiquidationStrategy);

export { start, makeLiquidationStrategy };
