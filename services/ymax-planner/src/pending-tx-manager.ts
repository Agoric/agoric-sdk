import type { AxelarId } from '@aglocal/portfolio-contract/src/portfolio.contract.ts';
import type { SigningSmartWalletKit } from '@agoric/client-utils';
import type { AxelarChain } from '@agoric/portfolio-api/src/constants.js';
import {
  TxStatus,
  TxType,
} from '@aglocal/portfolio-contract/src/resolver/constants.js';
import { watchGmp } from './watchers/gmp-watcher.ts';
import { resolvePendingTx } from './resolver.ts';
import { watchCctpTransfer } from './watchers/cctp-watcher.ts';
import type {
  PublishedTx,
  TxId,
} from '@aglocal/portfolio-contract/src/resolver/types.ts';
import type { EvmProviders, UsdcAddresses } from './support.ts';
import type { CaipChainId } from '@agoric/orchestration';
import { parseAccountId } from '@agoric/orchestration/src/utils/address.js';
import { Fail } from '@endo/errors';
import type { JsonRpcProvider } from 'ethers';

export type EvmChain = keyof typeof AxelarChain;

export type EvmContext = {
  usdcAddresses: UsdcAddresses['mainnet' | 'testnet'];
  evmProviders: EvmProviders;
  signingSmartWalletKit: SigningSmartWalletKit;
  fetch: typeof fetch;
};

export type GmpTransfer = {
  lcaAddr: string;
  destinationChain: AxelarId;
  contractAddress: `0x${string}`;
};

/**
 * PendingTx state machine:
 * pending -> success (when cross-chain operation completes successfully)
 * pending -> failed (when operation fails or times out)
 *
 * Terminal states: success and timeout never transition to other states.
 *
 * A PendingTx is a PublishedTx (published by ymax contract) with an additional
 * txId property used by the resolver to track and manage pending transactions.
 */
export type PendingTx = {
  txId: TxId;
} & PublishedTx;

type CctpTx = PendingTx & { type: typeof TxType.CCTP; amount: bigint };
type GmpTx = PendingTx & { type: typeof TxType.GMP };

export type PendingTxMonitor<T extends PendingTx = PendingTx> = {
  watch: (
    ctx: EvmContext,
    tx: T,
    log: (...args: unknown[]) => void,
    timeoutMinutes: number,
  ) => Promise<void>;
};

type MonitorRegistry = {
  [TxType.CCTP]: PendingTxMonitor<CctpTx>;
  [TxType.GMP]: PendingTxMonitor<GmpTx>;
};

const cctpMonitor: PendingTxMonitor<CctpTx> = {
  watch: async (ctx, tx, log, timeoutMinutes) => {
    const { txId, destinationAddress, amount } = tx;
    const logPrefix = `[${txId}]`;

    // Parse destinationAddress format: 'eip155:42161:0x126cf3AC9ea12794Ff50f56727C7C66E26D9C092'
    const { namespace, reference, accountAddress } =
      parseAccountId(destinationAddress);
    const caipId: CaipChainId = `${namespace}:${reference}`;

    caipId in ctx.usdcAddresses ||
      Fail`${logPrefix} Unsupported chain: ${caipId}`;
    caipId in ctx.evmProviders ||
      Fail`${logPrefix} No EVM provider for chain: ${caipId}`;

    const usdcAddress = ctx.usdcAddresses[caipId];
    const provider = ctx.evmProviders[caipId] as JsonRpcProvider;

    const transferStatus = await watchCctpTransfer({
      usdcAddress,
      watchAddress: accountAddress as `0x${string}`,
      expectedAmount: amount,
      provider,
      log: (msg, ...args) => log(`${logPrefix} ${msg}`, ...args),
      timeoutMinutes,
    });

    await resolvePendingTx({
      signingSmartWalletKit: ctx.signingSmartWalletKit,
      txId,
      status: transferStatus ? TxStatus.SUCCESS : TxStatus.FAILED,
    });

    log(`${logPrefix} CCTP tx resolved`);
  },
};

const gmpMonitor: PendingTxMonitor<GmpTx> = {
  watch: async (ctx, tx, log, timeoutMinutes) => {
    const { txId, destinationAddress } = tx;
    const logPrefix = `[${txId}]`;

    // Parse destinationAddress format: 'eip155:42161:0x126cf3AC9ea12794Ff50f56727C7C66E26D9C092'
    const { namespace, reference, accountAddress } =
      parseAccountId(destinationAddress);
    const caipId: CaipChainId = `${namespace}:${reference}`;
    caipId in ctx.evmProviders ||
      Fail`${logPrefix} No EVM provider for chain: ${caipId}`;

    const provider = ctx.evmProviders[caipId] as JsonRpcProvider;
    const res = await watchGmp({
      provider,
      contractAddress: accountAddress as `0x${string}`,
      txId,
      log: (msg, ...args) => log(`${logPrefix} ${msg}`, ...args),
      timeoutMinutes,
    });

    await resolvePendingTx({
      signingSmartWalletKit: ctx.signingSmartWalletKit,
      txId,
      status: res ? TxStatus.SUCCESS : TxStatus.FAILED,
    });

    log(`${logPrefix} GMP tx resolved`);
  },
};

const createMonitorRegistry = (): MonitorRegistry => ({
  [TxType.CCTP]: cctpMonitor,
  [TxType.GMP]: gmpMonitor,
});

type HandlePendingTxOptions = {
  log?: (...args: unknown[]) => void;
  registry?: MonitorRegistry;
  timeoutMinutes?: number;
};

export const handlePendingTx = async (
  ctx: EvmContext,
  tx: PendingTx,
  {
    log = () => {},
    registry = createMonitorRegistry(),
    timeoutMinutes = 5,
  }: HandlePendingTxOptions,
) => {
  await null;
  const logPrefix = `[${tx.txId}]`;
  log(`${logPrefix} handling ${tx.type} tx`);

  const monitor = registry[tx.type] as PendingTxMonitor;
  monitor || Fail`${logPrefix} No monitor registered for tx type: ${tx.type}`;
  await monitor.watch(ctx, tx, log, timeoutMinutes);
};
