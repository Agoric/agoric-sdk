// @ts-check

import { E } from '@endo/eventual-send';
import { offerTo } from '@agoric/zoe/src/contractSupport/index.js';
import { AmountMath } from '@agoric/ertp';
import { Far } from '@endo/marshal';

import { makeDefaultLiquidationStrategy } from './liquidation.js';
import { makeTracer } from '../makeTracer.js';

const trace = makeTracer('LiqMin');

/**
 * This contract liquidates the minimum amount of vault's collateral necessary
 * to satisfy the debt. It uses the AMM's swapOut, which sells no more than
 * necessary. Because it has offer safety, it can refuse the trade. When that
 * happens, we fall back to selling using the default strategy, which currently
 * uses the AMM's swapIn instead.
 *
 * @param {ZCF<{
 *   amm: AutoswapPublicFacet,
 * }>} zcf
 */
const start = async zcf => {
  const { amm } = zcf.getTerms();

  const makeDebtorHook = _runDebt => {
    /**
     * @param {ZCFSeat} debtorSeat
     * @param {object} root0
     * @param {Amount<'nat'>} root0.debt
     */
    return async (debtorSeat, { debt: runDebt }) => {
      const runBrand = runDebt.brand;
      const {
        give: { In: amountIn },
      } = debtorSeat.getProposal();
      // TODO XXX isn't `inBefore === aboutIn`?
      const inBefore = debtorSeat.getAmountAllocated('In');

      const swapInvitation = E(amm).makeSwapOutInvitation();
      const liqProposal = harden({
        give: { In: amountIn },
        want: { Out: runDebt },
      });
      trace(`OFFER TO DEBT: `, { runDebt, amountIn });
      const { deposited, userSeatPromise: liqSeat } = await offerTo(
        zcf,
        swapInvitation,
        undefined, // The keywords were mapped already
        liqProposal,
        debtorSeat,
      );

      // Three (!) awaits coming here. We can't use Promise.all because
      // offerTo() can return before getOfferResult() is valid, and we can't
      // check whether swapIn liquidated assets until getOfferResult() returns.
      // Of course, we also can't exit the seat until one or the other
      // liquidation takes place.
      const [offerResult, amounts, _] = await Promise.all([
        E(liqSeat).getOfferResult(),
        E(liqSeat).getCurrentAllocation(),
        deposited,
      ]);
      trace('offerResult', { offerResult, amounts });

      // if swapOut failed to make the trade, we'll sell it all
      const sellAllIfUnsold = async () => {
        const unsold = debtorSeat.getAmountAllocated('In');
        // TODO XXX This could be true if it gave me more collateral. This
        // should check that we actually got the debt amount
        if (!AmountMath.isEqual(inBefore, unsold)) {
          trace('Changed', { inBefore, unsold });
          return;
        }

        trace('liquidating all collateral because swapIn did not succeed');
        const strategy = makeDefaultLiquidationStrategy(amm);
        const { deposited: sellAllDeposited, userSeatPromise: sellAllSeat } =
          await offerTo(
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
      };
      await sellAllIfUnsold();
      const proceeds = debtorSeat.getAmountAllocated('RUN', runBrand);
      trace(`Liq results`, {
        runDebt,
        proceeds,
      });
      debtorSeat.exit();
    };
  };

  const creatorFacet = Far('debtorInvitationCreator', {
    makeDebtorInvitation: runDebt =>
      zcf.makeInvitation(makeDebtorHook(runDebt), 'Liquidate'),
  });

  return harden({ creatorFacet });
};

/** @typedef {ContractOf<typeof start>} LiquidationContract */

/**
 * @param {LiquidationContract['creatorFacet']} creatorFacet
 */
const makeLiquidationStrategy = creatorFacet => {
  const makeInvitation = async runDebt =>
    E(creatorFacet).makeDebtorInvitation(runDebt);

  const keywordMapping = () =>
    harden({
      Collateral: 'In',
      RUN: 'Out',
    });

  const makeProposal = (collateral, run) =>
    harden({
      give: { In: collateral },
      want: { Out: AmountMath.makeEmptyFromAmount(run) },
    });

  return {
    makeInvitation,
    keywordMapping,
    makeProposal,
  };
};

harden(start);
harden(makeLiquidationStrategy);

export { start, makeLiquidationStrategy };
