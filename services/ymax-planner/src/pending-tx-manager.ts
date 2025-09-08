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
import { watchNobleTransfer } from './watchers/noble-watcher.ts';
import type {
  PublishedTx,
  TxId,
} from '@aglocal/portfolio-contract/src/resolver/types.ts';
import type { EvmProviders, UsdcAddresses } from './support.ts';
import type { CosmosRestClient } from './cosmos-rest-client.ts';
import type { CaipChainId } from '@agoric/orchestration';
import { parseAccountId } from '@agoric/orchestration/src/utils/address.js';
import { Fail } from '@endo/errors';
import type { JsonRpcProvider } from 'ethers';
import type { Bech32Address } from '@agoric/orchestration';

export type EvmChain = keyof typeof AxelarChain;

export type EvmContext = {
  usdcAddresses: UsdcAddresses['mainnet' | 'testnet'];
  evmProviders: EvmProviders;
  signingSmartWalletKit: SigningSmartWalletKit;
  fetch: typeof fetch;
};

export type NobleContext = {
  cosmosRest: CosmosRestClient;
  signingSmartWalletKit: SigningSmartWalletKit;
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

type CctpTx = PendingTx & { type: typeof TxType.CCTP_TO_EVM; amount: bigint };
type GmpTx = PendingTx & { type: typeof TxType.GMP };
type NobleWithdrawTx = PendingTx & {
  type: typeof TxType.CCTP_TO_NOBLE;
  amount: bigint;
};

export type PendingTxMonitor<
  T extends PendingTx = PendingTx,
  C = EvmContext,
> = {
  watch: (
    ctx: C,
    tx: T,
    log: (...args: unknown[]) => void,
    timeoutMs: number,
  ) => Promise<void>;
};

type MonitorRegistry = {
  [TxType.CCTP_TO_EVM]: PendingTxMonitor<CctpTx, EvmContext>;
  [TxType.GMP]: PendingTxMonitor<GmpTx, EvmContext>;
  [TxType.CCTP_TO_NOBLE]: PendingTxMonitor<NobleWithdrawTx, NobleContext>;
};

const cctpMonitor: PendingTxMonitor<CctpTx, EvmContext> = {
  watch: async (ctx, tx, log, timeoutMs) => {
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
      timeoutMs,
    });

    await resolvePendingTx({
      signingSmartWalletKit: ctx.signingSmartWalletKit,
      txId,
      status: transferStatus ? TxStatus.SUCCESS : TxStatus.FAILED,
    });

    log(`${logPrefix} CCTP tx resolved`);
  },
};

const gmpMonitor: PendingTxMonitor<GmpTx, EvmContext> = {
  watch: async (ctx, tx, log, timeoutMs) => {
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
      timeoutMs,
    });

    await resolvePendingTx({
      signingSmartWalletKit: ctx.signingSmartWalletKit,
      txId,
      status: res ? TxStatus.SUCCESS : TxStatus.FAILED,
    });

    log(`${logPrefix} GMP tx resolved`);
  },
};

const nobleWithdrawMonitor: PendingTxMonitor<NobleWithdrawTx, NobleContext> = {
  watch: async (ctx, tx, log, timeoutMs) => {
    const { txId, destinationAddress, amount } = tx;
    const logPrefix = `[${txId}]`;

    const { namespace, reference, accountAddress } =
      parseAccountId(destinationAddress);

    namespace === 'cosmos' ||
      Fail`${logPrefix} Expected cosmos chain, got: ${namespace}`;
    reference === 'noble' ||
      Fail`${logPrefix} Expected noble chain, got: ${reference}`;

    const nobleAddress = accountAddress as Bech32Address;
    const expectedDenom = 'uusdc'; // TODO: find the exact denom while e2e testing

    log(
      `${logPrefix} Watching Noble withdrawal to ${nobleAddress} for ${amount} ${expectedDenom}`,
    );

    const transferStatus = await watchNobleTransfer({
      cosmosRest: ctx.cosmosRest,
      watchAddress: nobleAddress,
      expectedAmount: amount,
      expectedDenom,
      chainKey: 'noble',
      log: (msg, ...args) => log(`${logPrefix} ${msg}`, ...args),
      timeoutMs,
    });

    await resolvePendingTx({
      signingSmartWalletKit: ctx.signingSmartWalletKit,
      txId,
      status: transferStatus ? TxStatus.SUCCESS : TxStatus.FAILED,
    });

    log(`${logPrefix} Noble withdraw tx resolved`);
  },
};

const createMonitorRegistry = (): MonitorRegistry => ({
  [TxType.CCTP_TO_EVM]: cctpMonitor,
  [TxType.GMP]: gmpMonitor,
  [TxType.CCTP_TO_NOBLE]: nobleWithdrawMonitor,
});

type HandlePendingTxOptions = {
  log?: (...args: unknown[]) => void;
  registry?: MonitorRegistry;
  timeoutMs?: number;
};

export const handlePendingTx = async (
  ctx: EvmContext & Partial<NobleContext>,
  tx: PendingTx,
  {
    log = () => {},
    registry = createMonitorRegistry(),
    timeoutMs = 300000, // 5 min
  }: HandlePendingTxOptions,
) => {
  await null;
  const logPrefix = `[${tx.txId}]`;
  log(`${logPrefix} handling ${tx.type} tx`);

  const monitor = registry[tx.type] as PendingTxMonitor<PendingTx, any>;
  monitor || Fail`${logPrefix} No monitor registered for tx type: ${tx.type}`;

  // For Noble withdraws, we need the cosmosRest in the context
  if (tx.type === TxType.CCTP_TO_NOBLE) {
    !ctx.cosmosRest &&
      Fail`${logPrefix} cosmosRest required for Noble withdraw`;
    await monitor.watch(ctx as NobleContext, tx, log, timeoutMs);
  } else {
    await monitor.watch(ctx as EvmContext, tx, log, timeoutMs);
  }
};
