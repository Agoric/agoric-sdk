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

  /**
   * @param {ZCFSeat} debtorSeat
   * @param {{ debt: Amount<'nat'> }} options
   */
  const debtorHook = async (debtorSeat, { debt }) => {
    const debtBrand = debt.brand;
    const {
      give: { In: amountIn },
    } = debtorSeat.getProposal();
    const swapInvitation = E(amm).makeSwapOutInvitation();
    const liqProposal = harden({
      give: { In: amountIn },
      want: { Out: debt },
    });
    trace(`OFFER TO DEBT: `, debt, amountIn);
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
    const [offerResult, amounts, _deposited] = await Promise.all([
      E(liqSeat).getOfferResult(),
      E(liqSeat).getCurrentAllocation(),
      deposited,
    ]);
    trace('offerResult', offerResult, amounts);

    // if swapOut failed to make the trade, we'll sell it all
    const sellAllIfUnsold = async () => {
      const unsold = debtorSeat.getAmountAllocated('In');
      // We cannot easily directly check that the `offerTo` succeeded, so we
      // check that amotun unsold is not what we started with.
      if (!AmountMath.isEqual(amountIn, unsold)) {
        trace('Changed', { inBefore: amountIn, unsold });
        return;
      }

      trace('liquidating all collateral because swapIn did not succeed');
      const strategy = makeDefaultLiquidationStrategy(amm);
      const { deposited: sellAllDeposited, userSeatPromise: sellAllSeat } =
        await offerTo(
          zcf,
          strategy.makeInvitation(debt),
          undefined, // The keywords were mapped already
          strategy.makeProposal(amountIn, AmountMath.makeEmpty(debtBrand)),
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
    trace(`Liq results`, debt, debtorSeat.getAmountAllocated('RUN', debtBrand));
    debtorSeat.exit();
  };

  const creatorFacet = Far('debtorInvitationCreator', {
    makeDebtorInvitation: () => zcf.makeInvitation(debtorHook, 'Liquidate'),
  });

  return harden({ creatorFacet });
};

/** @typedef {ContractOf<typeof start>} LiquidationContract */

/**
 * @param {LiquidationContract['creatorFacet']} creatorFacet
 */
const makeLiquidationStrategy = creatorFacet => {
  const makeInvitation = () => E(creatorFacet).makeDebtorInvitation();

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
