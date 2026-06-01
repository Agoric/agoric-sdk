/**
 * @file Delegation wrapper exo. A portfolio owner may grant constrained
 * target-allocation authority to another Agoric address (e.g. an automation agent).
 *
 * For v1, only one permission is supported: `allocation`. The grantee may
 * adjust portions among the instruments currently in the portfolio's
 * `targetAllocation` but cannot introduce or remove instruments. `Deposit` and
 * `Withdraw` are not exposed to the grantee.
 *
 * @see {@link preparePortfolioDelegationKit}
 */
import type { TypedPattern } from '@agoric/internal';
import {
  PortfolioPermissionsExtShape,
  type FlowAgent,
  type PortfolioSyncState,
  type PortfolioPermissions,
} from '@agoric/portfolio-api';
import type { ZCF } from '@agoric/zoe';
import type { Zone } from '@agoric/zone';
import { Fail, q } from '@endo/errors';
import { M } from '@endo/patterns';
import type { PortfolioKit } from './portfolio.exo.ts';
import { TargetAllocationShape, type TargetAllocation } from './type-guards.ts';

export const PortfolioSyncStateShape: TypedPattern<PortfolioSyncState> =
  M.splitRecord({
    policyVersion: M.number(),
    rebalanceCount: M.number(),
  });

type DelegationState = {
  agentId: FlowAgent['id'];
  permissions: PortfolioPermissions;
  target: Pick<
    PortfolioKit,
    'reader' | 'planner' | 'reporter' | 'simpleRebalanceHandler'
  >;
};

const DelegationTargetShape = M.splitRecord({
  reader: M.remotable('PortfolioReader'),
  planner: M.remotable('PortfolioPlanner'),
  reporter: M.remotable('PortfolioReporter'),
  simpleRebalanceHandler: M.remotable('PortfolioSimpleRebalanceHandler'),
});

// exoClassKit expects a plain state-shape record, not a TypedPattern wrapper.
export const DelegationStateShape = {
  agentId: M.string(),
  permissions: PortfolioPermissionsExtShape,
  target: DelegationTargetShape,
};
harden(DelegationStateShape);

const sameKeySet = (a: Record<string, unknown>, b: Record<string, unknown>) => {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  const bSet = new Set(bk);
  return ak.every(k => bSet.has(k));
};

const DelegationReaderI = M.interface('PortfolioDelegationReader', {
  getPortfolioId: M.call().returns(M.number()),
  getPermissions: M.call().returns(PortfolioPermissionsExtShape),
});

const DelegationClientI = M.interface('PortfolioDelegationClient', {
  setTargetAllocation: M.call(
    TargetAllocationShape,
    PortfolioSyncStateShape,
  ).returns(M.string()),
});

export type PortfolioDelegationReader = {
  getPortfolioId: () => number;
  getPermissions: () => PortfolioPermissions;
};

export type PortfolioDelegationClient = {
  setTargetAllocation: (
    targetAllocation: TargetAllocation,
    syncState: PortfolioSyncState,
  ) => `flow${number}`;
};

export const preparePortfolioDelegationKit = (
  zone: Zone,
  { zcf }: { zcf: ZCF },
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
          const { reader } = this.state.target;
          return reader.getPortfolioId();
        },
        getPermissions(): PortfolioPermissions {
          return this.state.permissions;
        },
      },
      client: {
        setTargetAllocation(
          targetAllocation: TargetAllocation,
          syncState: PortfolioSyncState,
        ): `flow${number}` {
          const { agentId, target } = this.state;
          const { planner, reporter, simpleRebalanceHandler: handler } = target;

          // We can assume allocation permission because the grant path only
          // mints this wrapper when `permissions.allocation === true`.

          const current = target.reader.getTargetAllocation() || {};
          sameKeySet(current, targetAllocation) ||
            Fail`granted rebalance must preserve allocation key set: have ${q(Object.keys(current))}, got ${q(Object.keys(targetAllocation))}`;

          const { policyVersion, rebalanceCount } = syncState;
          planner.submitVersion(policyVersion, rebalanceCount);

          const { zcfSeat: emptySeat } = zcf.makeEmptySeatKit();
          const flowId = handler.handle(emptySeat, { targetAllocation });
          reporter.publishFlowAgent(Number(flowId.replace(/^flow/, '')), {
            id: agentId,
          });
          return flowId;
        },
      },
    },
    { stateShape: DelegationStateShape },
  );

export type PortfolioDelegationKit = ReturnType<
  ReturnType<typeof preparePortfolioDelegationKit>
>;
