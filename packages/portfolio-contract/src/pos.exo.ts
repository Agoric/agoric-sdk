/**
 * @file Position state management
 *
 * @see {@link preparePosition}
 * @see {@link Position}
 */
import { AmountMath, type Amount } from '@agoric/ertp';
import type { AccountId } from '@agoric/orchestration';
import { AnyNatAmountShape } from '@agoric/orchestration';
import type { YieldProtocol } from '@agoric/portfolio-api/src/constants.js';
import type { Zone } from '@agoric/zone';
import { M } from '@endo/patterns';
import { type PublishStatusFn } from './portfolio.exo.ts';
import { makePositionPath, type PoolKey } from './type-guards.ts';

const { assign } = Object;
const { add } = AmountMath;

interface PositionRd {
  getPoolKey(): PoolKey;
  getYieldProtocol(): YieldProtocol;
}

interface PositionPub extends PositionRd {
  publishStatus(): void;
}

export interface Position extends PositionPub {
  recordTransferIn(amount: Amount<'nat'>): Amount<'nat'>;
  recordTransferOut(amount: Amount<'nat'>): Amount<'nat'>;
}

export type TransferStatus = {
  totalIn: Amount<'nat'>;
  totalOut: Amount<'nat'>;
};

const recordTransferIn = (
  amount: Amount<'nat'>,
  state: TransferStatus,
  position: Pick<Position, 'publishStatus'>,
) => {
  const { totalIn } = state;
  assign(state, {
    totalIn: add(totalIn, amount),
  });
  position.publishStatus();
  return totalIn;
};

const recordTransferOut = (
  amount: Amount<'nat'>,
  state: TransferStatus,
  position: Pick<Position, 'publishStatus'>,
) => {
  const { totalOut } = state;
  assign(state, {
    totalOut: add(totalOut, amount),
  });
  position.publishStatus();
  return totalOut;
};

type ObsoleteTransferStatus = {
  netTransfers: Amount<'nat'>;
};

type PositionState = TransferStatus &
  ObsoleteTransferStatus & {
    portfolioId: number;
    protocol: YieldProtocol;
    poolKey: PoolKey;
    accountId: AccountId;
    etc: unknown;
  };

// a bit more lax than the type to facilitate evolution; hence not a TypedPattern
export const PositionStateShape = {
  portfolioId: M.number(),
  protocol: M.string(),
  totalIn: AnyNatAmountShape,
  totalOut: AnyNatAmountShape,
  netTransfers: AnyNatAmountShape,
  poolKey: M.string(),
  accountId: M.string(),
  etc: M.any(),
};
harden(PositionStateShape);

export const preparePosition = (
  zone: Zone,
  emptyTransferState: TransferStatus,
  publishStatus: PublishStatusFn,
) =>
  zone.exoClass(
    'Position',
    undefined, // interface TODO
    (
      portfolioId: number,
      poolKey: PoolKey,
      protocol: YieldProtocol,
      accountId: AccountId,
    ): PositionState => ({
      portfolioId,
      protocol,
      ...emptyTransferState,
      netTransfers: emptyTransferState.totalIn, // XXX ObsoleteTransferStatus
      poolKey,
      accountId,
      etc: undefined,
    }),
    {
      getPoolKey(): PoolKey {
        return this.state.poolKey;
      },
      getYieldProtocol() {
        const { protocol } = this.state;
        return protocol;
      },
      recordTransferIn(amount: Amount<'nat'>) {
        return recordTransferIn(amount, this.state, this.self);
      },
      recordTransferOut(amount: Amount<'nat'>) {
        return recordTransferOut(amount, this.state, this.self);
      },
      publishStatus() {
        const { portfolioId, poolKey, protocol, accountId, totalIn, totalOut } =
          this.state;
        const key = makePositionPath(portfolioId, poolKey);
        const status = harden({
          protocol,
          accountId,
          totalIn,
          totalOut,
        });
        // mustMatch(status, PositionStatusShape);
        publishStatus(key, status);
      },
    },
    {
      stateShape: PositionStateShape,
    },
  );
