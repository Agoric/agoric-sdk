/**
 * @file Delegation wrapper exo. A portfolio owner may grant constrained
 * authority to the holder of another Agoric account (e.g. an automation agent).
 *
 * @see {@link PortfolioPermissions} for the currently supported permissions
 *
 * @see {@link preparePortfolioDelegationKit}
 */
import type { TypedPattern } from '@agoric/internal';
import { type PortfolioSyncState } from '@agoric/portfolio-api';
import type { ZCF } from '@agoric/zoe';
import type { Zone } from '@agoric/zone';
import { Fail, q } from '@endo/errors';
import { M } from '@endo/patterns';

import { type TargetAllocation, TargetAllocationShape } from './type-guards.ts';

export const PortfolioSyncStateShape: TypedPattern<PortfolioSyncState> =
  M.splitRecord({
    policyVersion: M.number(),
    rebalanceCount: M.number(),
  });

type DelegationState = {
  agentId: number;
  portfolioAccess: PortfolioDelegationHelper;
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
  getPortfolioId: M.call().returns(M.number()),
});

const DelegationClientI = M.interface('PortfolioDelegationClient', {
  setTargetAllocation: M.call(
    TargetAllocationShape,
    PortfolioSyncStateShape,
  ).returns(M.string()),
});

export type PortfolioDelegationReader = {
  getPortfolioId: () => number;
};

export type PortfolioDelegationClient = {
  setTargetAllocation: (
    targetAllocation: TargetAllocation,
    syncState: PortfolioSyncState,
  ) => `flow${number}`;
};

export type PortfolioDelegationHelper = {
  getPortfolioId: (
    client: PortfolioDelegationClient,
    agentId: number,
  ) => number;
  getTargetAllocation: (
    client: PortfolioDelegationClient,
    agentId: number,
  ) => TargetAllocation | undefined;
  submitTargetAllocation: (
    client: PortfolioDelegationClient,
    agentId: number,
    targetAllocation: TargetAllocation,
    syncState: PortfolioSyncState,
  ) => `flow${number}`;
};

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
      },
      client: {
        setTargetAllocation(
          targetAllocation: TargetAllocation,
          syncState: PortfolioSyncState,
        ): `flow${number}` {
          const { portfolioAccess, agentId } = this.state;
          const current =
            portfolioAccess.getTargetAllocation(this.facets.client, agentId) ||
            {};
          const { extra, missing } = auditKeys(current, targetAllocation);
          extra.length === 0 || Fail`unauthorized allocations for ${q(extra)}`;
          missing.length === 0 || Fail`missing allocations for ${q(missing)}`;

          return portfolioAccess.submitTargetAllocation(
            this.facets.client,
            agentId,
            targetAllocation,
            syncState,
          );
        },
      },
    },
    { stateShape: DelegationStateShape },
  );

export type PortfolioDelegationKit = ReturnType<
  ReturnType<typeof preparePortfolioDelegationKit>
>;
