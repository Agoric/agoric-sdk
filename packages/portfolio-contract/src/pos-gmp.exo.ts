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
import type { AxelarChain, YieldProtocol } from './constants.js';
import {
  recordTransferIn,
  recordTransferOut,
  type PublishStatusFn,
  type TransferStatus,
} from './portfolio.exo.ts';
import { makePositionPath, type PoolKey } from './type-guards.ts';

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
      protocol: GMPProtocol,
      // XXX separate GMP account from position
      chainId: CaipChainId,
      chainName: AxelarChain,
    ) => ({
      portfolioId,
      protocol,
      ...emptyTransferState,
      poolKey: `${protocol}_${chainName}` as PoolKey,
      chainId,
      remoteAddressVK: vowTools.makeVowKit<`0x${string}`>(),
      accountId: undefined as undefined | AccountId,
    }),
    {
      getPoolKey(): PoolKey {
        return this.state.poolKey;
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
        // XXX separate GMP positions from accounts
        const { portfolioId, poolKey, protocol, accountId } = this.state;
        // TODO: typed pattern for GMP status
        const status = { protocol, accountId };
        publishStatus(makePositionPath(portfolioId, poolKey), status);
      },
      // XXX separate GMP positions from accounts
      resolveAddress(address: `0x${string}`) {
        const { chainId, remoteAddressVK } = this.state;
        remoteAddressVK.resolver.resolve(address);
        this.state.accountId = `${chainId}:${address}`;
        this.self.publishStatus();
      },
    },
  ); // TODO: satisfies (...args: any[]) => Position

export type GMPPosition = ReturnType<ReturnType<typeof prepareGMPPosition>>;
