/**
 * @file position state management for USDN (Noble Dollar) yield protocol.
 *
 * @see {@link prepareUSDNPosition}
 */
import type { AccountId } from '@agoric/orchestration';
import type { Zone } from '@agoric/zone';
import {
  recordTransferIn,
  recordTransferOut,
  type Position,
  type PublishStatusFn,
  type TransferStatus,
} from './portfolio.exo.ts';
import { makePositionPath } from './type-guards.ts';

export const prepareUSDNPosition = (
  zone: Zone,
  emptyTransferState: TransferStatus,
  publishStatus: PublishStatusFn,
) =>
  zone.exoClass(
    'USDN Position',
    undefined, // interface TODO
    (portfolioId: number, positionId: number, accountId: AccountId) => ({
      portfolioId,
      positionId,
      accountId,
      ...emptyTransferState,
    }),
    {
      getPositionId() {
        return this.state.positionId;
      },
      getYieldProtocol() {
        return 'USDN';
      },
      publishStatus() {
        const {
          portfolioId,
          positionId,
          accountId,
          netTransfers,
          totalIn,
          totalOut,
        } = this.state;
        // TODO: typed pattern for USDN status
        publishStatus(makePositionPath(portfolioId, positionId), {
          protocol: 'USDN',
          accountId,
          netTransfers,
          totalIn,
          totalOut,
        });
      },
      recordTransferIn(amount: Amount<'nat'>) {
        return recordTransferIn(amount, this.state, this.self);
      },
      recordTransferOut(amount: Amount<'nat'>) {
        return recordTransferOut(amount, this.state, this.self);
      },
    },
  ) satisfies (...args: any[]) => Position;
