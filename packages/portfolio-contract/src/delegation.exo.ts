/**
 * @file Delegation wrapper exo. A portfolio owner may grant constrained
 * authority to the holder of another Agoric account (e.g. an automation agent).
 *
 * @see {@link PortfolioPermissions} for the currently supported permissions
 *
 * @see {@link preparePortfolioDelegationKit}
 */
import type { TypedPattern } from '@agoric/internal';
import { SignedEIP712DataShape } from '@agoric/orchestration';
import {
  PortfolioAutoFeaturesExtShape,
  PortfolioFlowAgentMemoShape,
  PortfolioSyncStateShape,
  type FlowKey,
  type FundsFlowPlan,
  type PortfolioDelegatedClaimRewardsParams,
  type PortfolioDelegatedRebalanceParams,
  type PortfolioDelegatedSetTargetAllocationParams,
} from '@agoric/portfolio-api';
import type { ZCF } from '@agoric/zoe';
import type { Zone } from '@agoric/zone';
import { Fail, q } from '@endo/errors';
import { M } from '@endo/patterns';
import { hasRewardSteps } from './delegation-limits.ts';
import type { PortfolioObservationsVerifier } from './observation-verifier.ts';
import { TargetAllocationShape } from './type-guards.ts';
import type { makeOfferArgsShapes } from './type-guards-steps.ts';
import type { PortfolioKit } from './portfolio.exo.ts';

// TODO(#12011): move to `@agoric/portfolio-api` alongside PortfolioSyncStateShape /
// PortfolioDelegatedRebalanceParamsShape / PortfolioDelegatedClaimRewardsParamsShape
// once the dependencies of TargetAllocationShape on contract-local
// pool/protocol data (PoolPlaces et al.) and of the plan shape on the USDC
// brand are resolved.
const makePortfolioDelegatedSetTargetAllocationParamsShape = (
  planShape: TypedPattern<FundsFlowPlan>,
) =>
  M.splitRecord(
    {
      syncState: PortfolioSyncStateShape,
      targetAllocation: TargetAllocationShape,
    },
    {
      agentMemo: PortfolioFlowAgentMemoShape,
      plan: planShape,
      // Only the envelope: the content is validated when verifying it.
      signedObservations: SignedEIP712DataShape,
    },
    {},
  ) as TypedPattern<PortfolioDelegatedSetTargetAllocationParams>;

const makePortfolioDelegatedRebalanceParamsShape = (
  planShape: TypedPattern<FundsFlowPlan>,
) =>
  M.splitRecord(
    { syncState: PortfolioSyncStateShape },
    {
      agentMemo: PortfolioFlowAgentMemoShape,
      plan: planShape,
      // Only the envelope: the content is validated when verifying it.
      signedObservations: SignedEIP712DataShape,
    },
    {},
  ) as TypedPattern<PortfolioDelegatedRebalanceParams>;

/** A claim requires its plan and signed evidence up front. */
const makePortfolioDelegatedClaimRewardsParamsShape = (
  planShape: TypedPattern<FundsFlowPlan>,
) =>
  M.splitRecord(
    {
      syncState: PortfolioSyncStateShape,
      plan: planShape,
      // Only the envelope: the content is validated when verifying it.
      signedObservations: SignedEIP712DataShape,
    },
    { agentMemo: PortfolioFlowAgentMemoShape },
    {},
  ) as TypedPattern<PortfolioDelegatedClaimRewardsParams>;

type DelegationState = {
  agentId: number;
  portfolioAccess: PortfolioKit['delegationHelper'];
};

// exoClassKit expects a plain state-shape record, not a TypedPattern wrapper.
export const DelegationStateShape = {
  agentId: M.number(),
  portfolioAccess: M.remotable('PortfolioDelegationHelper'),
};
harden(DelegationStateShape);

const auditKeys = (
  expected: Record<string, unknown>,
  actual: Record<string, unknown>,
) => {
  const expectedKeys = Object.keys(expected);
  const actualKeys = Object.keys(actual);
  const expectedSet = new Set(expectedKeys);
  const actualSet = new Set(actualKeys);
  const extra = actualKeys.filter(key => !expectedSet.has(key));
  const missing = expectedKeys.filter(key => !actualSet.has(key));
  return harden({ extra, missing });
};

const DelegationReaderI = M.interface('PortfolioDelegationReader', {
  isActive: M.call().returns(M.boolean()),
  getPortfolioId: M.call().returns(M.number()),
  getAutoFeatures: M.call().returns(M.opt(PortfolioAutoFeaturesExtShape)),
});

const makeDelegationClientI = (planShape: TypedPattern<FundsFlowPlan>) =>
  M.interface('PortfolioDelegationClient', {
    getReader: M.call().returns(M.remotable('PortfolioDelegationReader')),
    // Async to allow for prompt asynchronous validation of the params.
    rebalance: M.callWhen(
      makePortfolioDelegatedRebalanceParamsShape(planShape),
    ).returns(M.string()),
    claimRewards: M.callWhen(
      makePortfolioDelegatedClaimRewardsParamsShape(planShape),
    ).returns(M.string()),
    setTargetAllocation: M.callWhen(
      makePortfolioDelegatedSetTargetAllocationParamsShape(planShape),
    ).returns(M.string()),
  });

/**
 * Prepare per-agent delegation facets using the supplied interface shapes.
 */
export const preparePortfolioDelegationKit = (
  zone: Zone,
  {
    zcf: _zcf,
    verifyPortfolioObservations,
    shapes,
  }: {
    zcf: ZCF;
    verifyPortfolioObservations: PortfolioObservationsVerifier;
    shapes: Pick<ReturnType<typeof makeOfferArgsShapes>, 'plan'>;
  },
) => {
  const DelegationClientI = makeDelegationClientI(shapes.plan);

  return zone.exoClassKit(
    'PortfolioDelegation',
    {
      reader: DelegationReaderI,
      client: DelegationClientI,
    },
    (initial: DelegationState): DelegationState => harden(initial),
    {
      reader: {
        getPortfolioId(): number {
          const { portfolioAccess, agentId } = this.state;
          return portfolioAccess.getPortfolioId(this.facets.client, agentId);
        },
        getAutoFeatures() {
          const { portfolioAccess, agentId } = this.state;
          return portfolioAccess.getAutoFeatures(this.facets.client, agentId);
        },
        isActive(): boolean {
          const { portfolioAccess, agentId } = this.state;
          try {
            portfolioAccess.getAuthorizedDelegation(
              this.facets.client,
              agentId,
            );
            return true;
          } catch {
            return false;
          }
        },
      },
      client: {
        getReader() {
          return this.facets.reader;
        },
        /**
         * Rebalance toward the current target allocation, with the plan of
         * the planner, or with a plan of the agent, which requires signed
         * observations.
         */
        async rebalance(
          params: PortfolioDelegatedRebalanceParams,
        ): Promise<FlowKey> {
          const { portfolioAccess, agentId } = this.state;
          const { signedObservations, ...rebalanceParams } = params;
          const { plan } = params;
          // Don't let an unauthorized client cause any verification work.
          // Authorization is checked again once verification resolves.
          portfolioAccess.getAuthorizedDelegation(this.facets.client, agentId, {
            rebalance: true,
            ...(plan && hasRewardSteps(plan) && { claimRewards: true }),
          });
          (plan === undefined) === (signedObservations === undefined) ||
            Fail`a plan requires signed observations, and vice versa`;
          // Resolves promptly. Everything below is checked after it does.
          const verifiedObservations = await (signedObservations &&
            verifyPortfolioObservations(signedObservations));
          // Only pass on the observations as verified.
          return portfolioAccess.submitRebalance(
            this.facets.client,
            agentId,
            harden(rebalanceParams),
            verifiedObservations,
          );
        },
        /**
         * Claim rewards, and swap them for USDC, with a plan of the agent
         * selecting signed evidence.
         */
        async claimRewards(
          params: PortfolioDelegatedClaimRewardsParams,
        ): Promise<FlowKey> {
          const { portfolioAccess, agentId } = this.state;
          // Don't let an unauthorized client cause any verification work.
          // Authorization is checked again once verification resolves.
          portfolioAccess.getAuthorizedDelegation(this.facets.client, agentId, {
            claimRewards: true,
          });
          const { signedObservations, ...claimParams } = params;
          // Resolves promptly. Everything below is checked after it does.
          const verifiedObservations =
            await verifyPortfolioObservations(signedObservations);
          // Only pass on the observations as verified.
          return portfolioAccess.submitClaimRewards(
            this.facets.client,
            agentId,
            harden(claimParams),
            verifiedObservations,
          );
        },
        async setTargetAllocation(
          params: PortfolioDelegatedSetTargetAllocationParams,
        ): Promise<FlowKey> {
          const { portfolioAccess, agentId } = this.state;
          // Don't let an unauthorized client cause any verification work.
          // Authorization is checked again once verification resolves.
          // Supplying a plan also requires the authority to rebalance, so that
          // `rebalance: false` limits an agent to target-only updates.
          portfolioAccess.getAuthorizedDelegation(this.facets.client, agentId, {
            allocation: true,
            ...(params.plan !== undefined && { rebalance: true }),
            ...(params.plan &&
              hasRewardSteps(params.plan) && { claimRewards: true }),
          });
          const { signedObservations, ...allocationParams } = params;
          (params.plan === undefined) === (signedObservations === undefined) ||
            Fail`a plan requires signed observations, and vice versa`;
          // Resolves promptly. Everything below is checked after it does.
          const verifiedObservations = await (signedObservations &&
            verifyPortfolioObservations(signedObservations));
          const current =
            portfolioAccess.getTargetAllocation(this.facets.client, agentId) ||
            {};
          const { extra, missing } = auditKeys(
            current,
            params.targetAllocation,
          );
          extra.length === 0 || Fail`unauthorized allocations for ${q(extra)}`;
          missing.length === 0 || Fail`missing allocations for ${q(missing)}`;

          // Only pass on the observations as verified.
          return portfolioAccess.submitTargetAllocation(
            this.facets.client,
            agentId,
            harden(allocationParams),
            verifiedObservations,
          );
        },
      },
    },
    { stateShape: DelegationStateShape },
  );
};

export type PortfolioDelegationKit = ReturnType<
  ReturnType<typeof preparePortfolioDelegationKit>
>;

export type PortfolioDelegationClient = PortfolioDelegationKit['client'];
