/**
 * @file Position state management
 *
 * @see {@link preparePosition}
 * @see {@link Position}
 */
import { AmountMath, type Amount } from '@agoric/ertp';
import { AnyNatAmountShape } from '@agoric/orchestration';
import type { AccountId } from '@agoric/orchestration';
import type { Zone } from '@agoric/zone';
import type { YieldProtocol } from '@agoric/portfolio-api/src/constants.js';
import { M } from '@endo/patterns';
import { type PublishStatusFn } from './portfolio.exo.ts';
import { makePositionPath, PoolKeyShapeExt, YieldProtocolShapeExt, type PoolKey } from './type-guards.ts';

const { assign } = Object;
const { add, subtract } = AmountMath;

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
  netTransfers: Amount<'nat'>;
};

const PositionInterface = M.interface('Position', {
  getPoolKey: M.call().returns(PoolKeyShapeExt),
  getYieldProtocol: M.call().returns(YieldProtocolShapeExt),
  recordTransferIn: M.call(AnyNatAmountShape).returns(AnyNatAmountShape),
  recordTransferOut: M.call(AnyNatAmountShape).returns(AnyNatAmountShape),
  publishStatus: M.call().returns(),
});

const positionStateShape = harden({
  portfolioId: M.number(),
  protocol: YieldProtocolShapeExt, // YieldProtocol
  poolKey: PoolKeyShapeExt,
  accountId: M.string(), // AccountId
  totalIn: AnyNatAmountShape,
  totalOut: AnyNatAmountShape,
  netTransfers: AnyNatAmountShape,
});

const recordTransferIn = (
  amount: Amount<'nat'>,
  state: TransferStatus,
  position: Pick<Position, 'publishStatus'>,
) => {
  const { netTransfers, totalIn } = state;
  assign(state, {
    netTransfers: add(netTransfers, amount),
    totalIn: add(totalIn, amount),
  });
  position.publishStatus();
  return state.netTransfers;
};

const recordTransferOut = (
  amount: Amount<'nat'>,
  state: TransferStatus,
  position: Pick<Position, 'publishStatus'>,
) => {
  const { netTransfers, totalOut } = state;
  assign(state, {
    netTransfers: subtract(netTransfers, amount),
    totalOut: add(totalOut, amount),
  });
  position.publishStatus();
  return state.netTransfers;
};

export const preparePosition = (
  zone: Zone,
  emptyTransferState: TransferStatus,
  publishStatus: PublishStatusFn,
) =>
  zone.exoClass(
    'Position',
    PositionInterface,
    (
      portfolioId: number,
      poolKey: PoolKey,
      protocol: YieldProtocol,
      accountId: AccountId,
    ) => ({
      portfolioId,
      protocol,
      ...emptyTransferState,
      poolKey,
      accountId,
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
        const {
          portfolioId,
          poolKey,
          protocol,
          accountId,
          netTransfers,
          totalIn,
          totalOut,
        } = this.state;
        const key = makePositionPath(portfolioId, poolKey);
        const status = harden({
          protocol,
          accountId,
          netTransfers,
          totalIn,
          totalOut,
        });
        // mustMatch(status, PositionStatusShape);
        publishStatus(key, status);
      },
    },
    { stateShape: positionStateShape },
  );
