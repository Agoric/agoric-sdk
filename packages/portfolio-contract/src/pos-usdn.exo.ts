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
    (portfolioId: number, accountId: AccountId) => ({
      portfolioId,
      accountId,
      ...emptyTransferState,
    }),
    {
      getPoolKey() {
        return 'USDN'; // XXX USDNLock too
      },
      getYieldProtocol() {
        return 'USDN';
      },
      publishStatus() {
        const { portfolioId, accountId, netTransfers, totalIn, totalOut } =
          this.state;
        publishStatus(makePositionPath(portfolioId, 'USDN'), {
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

export type USDNPosition = ReturnType<ReturnType<typeof prepareUSDNPosition>>;
