/**
 * @file Delegation wrapper exo. A portfolio owner may grant constrained
 * authority to the holder of another Agoric account (e.g. an automation agent).
 *
 * This layer is responsible for delegated permission and constraint
 * enforcement. The portfolio helper facet is the narrower execution authority:
 * it exposes portfolio state reads, current time, and the ability to submit an
 * already-authorized delegated action.
 *
 * @see {@link PortfolioPermissions} for the currently supported permissions
 *
 * @see {@link preparePortfolioDelegationKit}
 */
import type { TypedPattern } from '@agoric/internal';
import { partialMap } from '@agoric/internal/src/js-utils.js';
import {
  PortfolioAutoFeaturesExtShape,
  isInstrumentId,
  type FlowKey,
  type PortfolioPermissions,
  type PortfolioSyncState,
} from '@agoric/portfolio-api';
import type { ZCF } from '@agoric/zoe';
import type { Zone } from '@agoric/zone';
import { assert, Fail, q } from '@endo/errors';
import { M } from '@endo/patterns';
import { TargetAllocationShape, type TargetAllocation } from './type-guards.ts';
import type { PortfolioKit } from './portfolio.exo.ts';

export const PortfolioSyncStateShape: TypedPattern<PortfolioSyncState> =
  M.splitRecord({
    policyVersion: M.number(),
    rebalanceCount: M.number(),
  });

type DelegationState = {
  agentId: number;
  portfolioAccess: PortfolioKit['delegationHelper'];
  turnoverBudgetState?: {
    lastUpdatedAt: bigint;
    remainingBpSeconds: bigint;
  };
};

const DAY_SECONDS = 24n * 3600n;

export const checkTurnoverBudget = ({
  currentAllocation,
  nextAllocation,
  maxBpsPerDay,
  remainingBps,
  secondsElapsedSinceLastUpdate,
  currentTimeAbsValue,
  priorTurnoverBudgetState,
}: {
  currentAllocation: TargetAllocation;
  nextAllocation: TargetAllocation;
  maxBpsPerDay: number;
  remainingBps?: number;
  secondsElapsedSinceLastUpdate?: number;
  currentTimeAbsValue?: bigint;
  priorTurnoverBudgetState?: {
    lastUpdatedAt: bigint;
    remainingBpSeconds: bigint;
  };
}): {
  allowed: boolean;
  consumedBps: number;
  remainingBps: number;
  availableBpsBeforeSpend: number;
  refilledBps: number;
  nextTurnoverBudgetState?:
    | {
        lastUpdatedAt: bigint;
        remainingBpSeconds: bigint;
      }
    | undefined;
} => {
  const currentTotal = Object.values(currentAllocation).reduce(
    (sum, weight) => sum + weight,
    0n,
  );
  const nextTotal = Object.values(nextAllocation).reduce(
    (sum, weight) => sum + weight,
    0n,
  );
  assert(currentTotal > 0n);
  assert(nextTotal > 0n);

  const totalDeltaNumerator = Array.from(
    new Set([
      ...Object.keys(currentAllocation),
      ...Object.keys(nextAllocation),
    ]),
  ).reduce((sum, key) => {
    const currentWeight = currentAllocation[key] ?? 0n;
    const nextWeight = nextAllocation[key] ?? 0n;
    const delta = currentWeight * nextTotal - nextWeight * currentTotal;
    return sum + (delta < 0n ? -delta : delta);
  }, 0n);
  const consumedBpsDenominator = 2n * currentTotal * nextTotal;
  const consumedBpsQuotient =
    (totalDeltaNumerator * 10_000n) / consumedBpsDenominator;
  const consumedBpsRemainder =
    (totalDeltaNumerator * 10_000n) % consumedBpsDenominator;
  const consumedBps = Number(
    consumedBpsQuotient +
      (2n * consumedBpsRemainder > consumedBpsDenominator ||
      (2n * consumedBpsRemainder === consumedBpsDenominator &&
        consumedBpsQuotient % 2n === 1n)
        ? 1n
        : 0n),
  );

  const maxBudgetBpSeconds = BigInt(maxBpsPerDay) * DAY_SECONDS;
  const effectiveSecondsElapsedSinceLastUpdate =
    secondsElapsedSinceLastUpdate ??
    (priorTurnoverBudgetState && currentTimeAbsValue !== undefined
      ? Number(currentTimeAbsValue - priorTurnoverBudgetState.lastUpdatedAt)
      : 0);
  const effectiveRemainingBpSeconds =
    remainingBps === undefined
      ? (priorTurnoverBudgetState?.remainingBpSeconds ?? maxBudgetBpSeconds)
      : BigInt(remainingBps) * DAY_SECONDS;
  const refilledBpSeconds =
    BigInt(maxBpsPerDay) * BigInt(effectiveSecondsElapsedSinceLastUpdate);
  const availableBpSecondsBeforeSpend =
    effectiveRemainingBpSeconds + refilledBpSeconds <= maxBudgetBpSeconds
      ? effectiveRemainingBpSeconds + refilledBpSeconds
      : maxBudgetBpSeconds;
  const consumedBpSeconds = BigInt(consumedBps) * DAY_SECONDS;
  const allowed = consumedBpSeconds <= availableBpSecondsBeforeSpend;
  const remainingAfterSpendBpSeconds = allowed
    ? availableBpSecondsBeforeSpend - consumedBpSeconds
    : availableBpSecondsBeforeSpend;

  return harden({
    allowed,
    consumedBps,
    availableBpsBeforeSpend: Number(
      availableBpSecondsBeforeSpend / DAY_SECONDS,
    ),
    refilledBps: Number(refilledBpSeconds / DAY_SECONDS),
    remainingBps: Number(remainingAfterSpendBpSeconds / DAY_SECONDS),
    nextTurnoverBudgetState:
      currentTimeAbsValue === undefined
        ? undefined
        : consumedBps === 0
          ? priorTurnoverBudgetState
          : harden({
              lastUpdatedAt: currentTimeAbsValue,
              remainingBpSeconds: remainingAfterSpendBpSeconds,
            }),
  });
};
harden(checkTurnoverBudget);

export const assertWithinTurnoverBudget = (
  args: Parameters<typeof checkTurnoverBudget>[0],
) => {
  const result = checkTurnoverBudget(args);
  result.allowed || Fail`delegated move exceeds delegated turnover budget`;
  return result;
};
harden(assertWithinTurnoverBudget);

// exoClassKit expects a plain state-shape record, not a TypedPattern wrapper.
export const DelegationStateShape = {
  agentId: M.number(),
  portfolioAccess: M.remotable('PortfolioDelegationHelper'),
  turnoverBudgetState: M.opt(
    M.splitRecord(
      { lastUpdatedAt: M.nat(), remainingBpSeconds: M.nat() },
      {},
      {},
    ),
  ),
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

const assertAuthorizedAllocationKeys = (
  expected: Record<string, unknown>,
  actual: Record<string, unknown>,
) => {
  const { extra, missing } = auditKeys(expected, actual);
  extra.length === 0 || Fail`unauthorized allocations for ${q(extra)}`;
  missing.length === 0 || Fail`missing allocations for ${q(missing)}`;
};
harden(assertAuthorizedAllocationKeys);

const assertWithinAllocationCap = (
  targetAllocation: TargetAllocation,
  capBps: number | undefined,
) => {
  if (capBps === undefined) {
    return;
  }
  // `capBps` comes from the validated permission shape, so BigInt() is safe.
  const scaledCap =
    BigInt(capBps) *
    Object.values(targetAllocation).reduce((sum, weight) => sum + weight, 0n);
  if (scaledCap === 0n) {
    return;
  }
  const overCap = partialMap(
    Object.entries(targetAllocation),
    ([key, weight]) =>
      weight * 10_000n > scaledCap && isInstrumentId(key) ? key : undefined,
  );
  overCap.length === 0 ||
    Fail`target allocation exceeds allocation cap for ${q(overCap)}`;
};

const DelegationReaderI = M.interface('PortfolioDelegationReader', {
  isActive: M.call().returns(M.boolean()),
  getPortfolioId: M.call().returns(M.number()),
  getAutoFeatures: M.call().returns(M.opt(PortfolioAutoFeaturesExtShape)),
});

const DelegationClientI = M.interface('PortfolioDelegationClient', {
  getReader: M.call().returns(M.remotable('PortfolioDelegationReader')),
  rebalance: M.call(PortfolioSyncStateShape).returns(M.string()),
  setTargetAllocation: M.callWhen(
    TargetAllocationShape,
    PortfolioSyncStateShape,
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
        rebalance(syncState: PortfolioSyncState): FlowKey {
          const { portfolioAccess, agentId } = this.state;
          return portfolioAccess.submitRebalance(
            this.facets.client,
            agentId,
            syncState,
          );
        },
        /**
         * Returns FlowKey promptly, before orchestration begins
         */
        async setTargetAllocation(
          targetAllocation: TargetAllocation,
          syncState: PortfolioSyncState,
        ): Promise<FlowKey> {
          const { portfolioAccess, agentId } = this.state;
          const { client } = this.facets;

          const permissions = portfolioAccess.getPermissions(
            this.facets.client,
            agentId,
            syncState,
          );
          const { allocation } = permissions;
          allocation || Fail`delegated action requires allocation permission`;

          const current =
            portfolioAccess.getTargetAllocation(client, agentId) || {};
          assertAuthorizedAllocationKeys(current, targetAllocation);
          const refinements = allocation === true ? {} : allocation || {};
          const { capBps, maxBpsPerDay } = refinements;
          assertWithinAllocationCap(targetAllocation, capBps);

          await null;
          if (maxBpsPerDay !== undefined) {
            // `getCurrentTimestamp()` is prompt.
            const { absValue: now } = await portfolioAccess.getCurrentTimestamp(
              this.facets.client,
              agentId,
            );
            const { nextTurnoverBudgetState } = assertWithinTurnoverBudget({
              currentAllocation: current,
              nextAllocation: targetAllocation,
              maxBpsPerDay,
              currentTimeAbsValue: now,
              priorTurnoverBudgetState: this.state.turnoverBudgetState,
            });
            this.state.turnoverBudgetState = nextTurnoverBudgetState;
          }
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

export type PortfolioDelegationClient = PortfolioDelegationKit['client'];
