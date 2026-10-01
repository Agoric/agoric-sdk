/**
 * @file Delegation wrapper exo. A portfolio owner may grant constrained
 * authority to the holder of another Agoric account (e.g. an automation agent).
 *
 * @see {@link PortfolioPermissions} for the currently supported permissions
 *
 * @see {@link preparePortfolioDelegationKit}
 */
import {
  PortfolioAutoFeaturesExtShape,
  PortfolioDelegatedClaimRewardsParamsShape,
  PortfolioDelegatedRebalanceParamsShape,
  PortfolioFlowAgentMemoShape,
  PortfolioSyncStateShape,
  type FlowKey,
  type PortfolioDelegatedClaimRewardsParams,
  type PortfolioDelegatedRebalanceParams,
  type PortfolioDelegatedSetTargetAllocationParams,
} from '@agoric/portfolio-api';
import type { Zone } from '@agoric/zone';
import { Fail, q } from '@endo/errors';
import { keyEQ, M } from '@endo/patterns';
import { TargetAllocationShape } from './type-guards.ts';
import { makeOfferArgsShapes } from './type-guards-steps.ts';
import type { PortfolioKit } from './portfolio.exo.ts';

type DelegationState = {
  agentId: number;
  portfolioAccess: PortfolioKit['delegationHelper'];
};

/**
 * Temporary signature fixture pending real attestation verification.
 * TODO(AGO-1289): DELETE ME!
 */
export const goodSig = harden({ sig: true });

/** Require the temporary valid-signature fixture whenever a plan is supplied. */
const checkAttestation = ({
  plan,
  attestation,
}: PortfolioDelegatedSetTargetAllocationParams) => {
  plan === undefined ||
    keyEQ(attestation?.signature, goodSig) ||
    Fail`customer-supplied plans require an attestation`;
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

/**
 * Prepare per-agent delegation facets using the supplied interface shapes.
 */
export const preparePortfolioDelegationKit = (
  zone: Zone,
  { shapes }: { shapes: ReturnType<typeof makeOfferArgsShapes> },
) => {
  const { plan } = shapes;
  const DelegationClientI = M.interface('PortfolioDelegationClient', {
    getReader: M.call().returns(M.remotable('PortfolioDelegationReader')),
    rebalance: M.call(PortfolioDelegatedRebalanceParamsShape).returns(
      M.string(),
    ),
    claimRewards: M.call(PortfolioDelegatedClaimRewardsParamsShape).returns(
      M.string(),
    ),
    setTargetAllocation: M.call(
      M.splitRecord(
        {
          syncState: PortfolioSyncStateShape,
          targetAllocation: TargetAllocationShape,
        },
        {
          agentMemo: PortfolioFlowAgentMemoShape,
          plan,
          attestation: M.splitRecord(
            { observations: M.record(), signature: M.any() },
            {},
          ),
        },
        {},
      ),
    ).returns(M.string()),
  });

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
        rebalance(params: PortfolioDelegatedRebalanceParams): FlowKey {
          const { portfolioAccess, agentId } = this.state;
          return portfolioAccess.submitRebalance(
            this.facets.client,
            agentId,
            params,
          );
        },
        claimRewards(params: PortfolioDelegatedClaimRewardsParams): FlowKey {
          const { portfolioAccess, agentId } = this.state;
          return portfolioAccess.submitClaimRewards(
            this.facets.client,
            agentId,
            params,
          );
        },
        setTargetAllocation(
          params: PortfolioDelegatedSetTargetAllocationParams,
        ): FlowKey {
          checkAttestation(params);
          const { portfolioAccess, agentId } = this.state;
          const current =
            portfolioAccess.getTargetAllocation(this.facets.client, agentId) ||
            {};
          const { extra, missing } = auditKeys(
            current,
            params.targetAllocation,
          );
          extra.length === 0 || Fail`unauthorized allocations for ${q(extra)}`;
          missing.length === 0 || Fail`missing allocations for ${q(missing)}`;

          return portfolioAccess.submitTargetAllocation(
            this.facets.client,
            agentId,
            params,
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
