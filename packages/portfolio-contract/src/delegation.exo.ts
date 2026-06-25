/**
 * @file Delegation wrapper exo. A portfolio owner may grant constrained
 * authority to the holder of another Agoric account (e.g. an automation agent).
 *
 * @see {@link PortfolioPermissions} for the currently supported permissions
 *
 * @see {@link preparePortfolioDelegationKit}
 */
import type { TypedPattern } from '@agoric/internal';
import {
  PortfolioAutoFeaturesExtShape,
  type FlowKey,
  type PortfolioDelegatedRebalanceParams,
  type PortfolioDelegatedSetTargetAllocationParams,
  type PortfolioSyncState,
} from '@agoric/portfolio-api';
import type { ZCF } from '@agoric/zoe';
import type { Zone } from '@agoric/zone';
import { Fail, q } from '@endo/errors';
import { M } from '@endo/patterns';
import { TargetAllocationShape } from './type-guards.ts';
import type { PortfolioKit } from './portfolio.exo.ts';

export const PortfolioSyncStateShape: TypedPattern<PortfolioSyncState> =
  M.splitRecord({
    policyVersion: M.number(),
    rebalanceCount: M.number(),
  });

export const PortfolioDelegatedRebalanceParamsShape: TypedPattern<PortfolioDelegatedRebalanceParams> =
  M.splitRecord({ syncState: PortfolioSyncStateShape }, {}, {});

export const PortfolioDelegatedSetTargetAllocationParamsShape: TypedPattern<PortfolioDelegatedSetTargetAllocationParams> =
  M.splitRecord(
    {
      syncState: PortfolioSyncStateShape,
      targetAllocation: TargetAllocationShape,
    },
    {},
    {},
  );

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

const DelegationClientI = M.interface('PortfolioDelegationClient', {
  getReader: M.call().returns(M.remotable('PortfolioDelegationReader')),
  rebalance: M.call(PortfolioDelegatedRebalanceParamsShape).returns(M.string()),
  setTargetAllocation: M.call(
    PortfolioDelegatedSetTargetAllocationParamsShape,
  ).returns(M.string()),
});

export const preparePortfolioDelegationKit = (
  zone: Zone,
  { zcf: _zcf }: { zcf: ZCF },
) =>
  zone.exoClassKit(
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
            portfolioAccess.assertActive(this.facets.client, agentId);
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
        setTargetAllocation(
          params: PortfolioDelegatedSetTargetAllocationParams,
        ): FlowKey {
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

export type PortfolioDelegationKit = ReturnType<
  ReturnType<typeof preparePortfolioDelegationKit>
>;

export type PortfolioDelegationClient = PortfolioDelegationKit['client'];
