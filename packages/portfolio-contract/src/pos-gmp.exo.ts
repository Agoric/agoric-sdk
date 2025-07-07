/**
 * @file Position state management for Aave, Compound.
 *
 * Since Axelar GMP is used in both cases, we use "gmp" in the filename.
 *
 * @see {@link prepareGMPPosition}
 * @see {@link GMPPosition}
 */
import type { AccountId, CaipChainId } from '@agoric/orchestration';
import type { Vow, VowTools } from '@agoric/vow';
import type { Zone } from '@agoric/zone';
import type { YieldProtocol } from './constants.js';
import {
  recordTransferIn,
  recordTransferOut,
  type PublishStatusFn,
  type TransferStatus,
} from './portfolio.exo.ts';
import { makePositionPath } from './type-guards.ts';

export type GMPProtocol = YieldProtocol & ('Aave' | 'Compound');

export const prepareGMPPosition = (
  zone: Zone,
  vowTools: VowTools,
  emptyTransferState: TransferStatus,
  publishStatus: PublishStatusFn,
) =>
  zone.exoClass(
    'GMP Position',
    undefined, // interface TODO
    (
      portfolioId: number,
      positionId: number,
      protocol: GMPProtocol,
      chainId: CaipChainId,
    ) => ({
      portfolioId,
      positionId,
      protocol,
      ...emptyTransferState,
      chainId,
      remoteAddressVK: vowTools.makeVowKit<`0x${string}`>(),
      accountId: undefined as undefined | AccountId,
    }),
    {
      getPositionId() {
        return this.state.positionId;
      },
      getYieldProtocol() {
        const { protocol } = this.state;
        return protocol;
      },
      getAddress(): Vow<`0x${string}`> {
        const { remoteAddressVK } = this.state;
        // TODO: when the vow resolves, publishStatus()
        return remoteAddressVK.vow;
      },
      getChainId() {
        return this.state.chainId;
      },
      recordTransferIn(amount: Amount<'nat'>) {
        return recordTransferIn(amount, this.state, this.self);
      },
      recordTransferOut(amount: Amount<'nat'>) {
        return recordTransferOut(amount, this.state, this.self);
      },
      publishStatus() {
        const { portfolioId, positionId, protocol, accountId } = this.state;
        // TODO: typed pattern for GMP status
        const status = { protocol, accountId };
        publishStatus(makePositionPath(portfolioId, positionId), status);
      },
      resolveAddress(address: `0x${string}`) {
        const { chainId, remoteAddressVK } = this.state;
        remoteAddressVK.resolver.resolve(address);
        this.state.accountId = `${chainId}:${address}`;
        this.self.publishStatus();
      },
    },
  ); // TODO: satisfies (...args: any[]) => Position

export type GMPPosition = ReturnType<ReturnType<typeof prepareGMPPosition>>;
