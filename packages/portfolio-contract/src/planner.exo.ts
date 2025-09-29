/**
 * @file Planner exo for off-chain planning services to submit portfolio rebalancing plans.
 * @see {@link preparePlanner}
 */
import { makeTracer } from '@agoric/internal';
import { type Vow, VowShape, type VowTools } from '@agoric/vow';
import type { ZCF, ZCFSeat } from '@agoric/zoe';
import type { Zone } from '@agoric/zone';
import { M } from '@endo/patterns';
import type { PortfolioKit } from './portfolio.exo.ts';
import type { MovementDesc, OfferArgsFor } from './type-guards-steps.ts';
import { makeOfferArgsShapes } from './type-guards-steps.ts';

const trace = makeTracer('PPLN');

/**
 * Prepare a Planner exoClass for off-chain planning services.
 *
 * Planning is currently done off-chain
 * because it requires access to real-time APYs, balances, and market data that
 * are not readily available to the on-chain contract.
 */
export const preparePlanner = (
  zone: Zone,
  {
    rebalance,
    zcf,
    getPortfolio,
    shapes,
    vowTools,
  }: {
    rebalance: (
      seat: ZCFSeat,
      offerArgs: OfferArgsFor['rebalance'],
      kit: unknown, // XXX avoid circular reference
    ) => Vow<any>; // XXX HostForGuest???
    zcf: ZCF;
    getPortfolio: (id: number) => PortfolioKit;
    shapes: ReturnType<typeof makeOfferArgsShapes>;
    vowTools: Pick<VowTools, 'asVow'>;
  },
) => {
  const { movementDescShape } = shapes;
  const PlannerI = M.interface('Planner', {
    submit: M.call(M.number(), M.arrayOf(movementDescShape), M.number())
      .optional(M.number())
      .returns(VowShape),
    resolvePlan: M.call(
      M.number(),
      M.number(),
      M.arrayOf(movementDescShape),
      M.number(),
    )
      .optional(M.number())
      .returns(),
  });

  return zone.exoClass(
    'Planner',
    PlannerI,
    () => ({ etc: undefined }),
    {
      /**
       * Submit a plan (sequence of moves) for execution in a new flow.
       *
       * Used by off-chain planning services to carry out expressed wishes
       * of a portfolio owner.
       *
       * @param portfolioId - Target portfolio identifier
       * @param plan - Array of asset movements to execute
       * @param policyVersion - on which plan is based
       * @param rebalanceCount - presumed current count
       * @throws i.e. Vow rejects if portfolio not found, policyVersion is not current,
       *   or plan validation or execution fails
       */
      submit(
        portfolioId: number,
        plan: MovementDesc[],
        policyVersion: number,
        rebalanceCount = 0,
      ): Vow<void> {
        return vowTools.asVow(async () => {
          trace('TODO(#11782): vet plan', { portfolioId, plan });
          const pKit = getPortfolio(portfolioId);
          pKit.planner.submitVersion(policyVersion, rebalanceCount);
          const { zcfSeat: emptySeat } = zcf.makeEmptySeatKit();
          return rebalance(emptySeat, { flow: plan }, pKit);
        });
      },
      resolvePlan(
        portfolioId: number,
        flowId: number,
        plan: MovementDesc[],
        policyVersion: number,
        rebalanceCount = 0,
      ) {
        trace('TODO(#11782): vet plan', { portfolioId, plan });
        const { planner: portfolioPlanner } = getPortfolio(portfolioId);
        portfolioPlanner.submitVersion(policyVersion, rebalanceCount);
        portfolioPlanner.resolveFlowPlan(flowId, plan);
      },
    },
    {
      stateShape: { etc: M.any() },
    },
  );
};

export type PortfolioPlanner = ReturnType<ReturnType<typeof preparePlanner>>;
