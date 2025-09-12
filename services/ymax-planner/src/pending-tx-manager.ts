import type { JsonRpcProvider } from 'ethers';

import { Fail } from '@endo/errors';

import type { SigningSmartWalletKit } from '@agoric/client-utils';
import type { Bech32Address, CaipChainId } from '@agoric/orchestration';
import { parseAccountId } from '@agoric/orchestration/src/utils/address.js';
import type { AxelarChain } from '@agoric/portfolio-api/src/constants.js';

import type { AxelarId } from '@aglocal/portfolio-contract/src/portfolio.contract.ts';
import {
  TxStatus,
  TxType,
} from '@aglocal/portfolio-contract/src/resolver/constants.js';
import type { PendingTx } from '@aglocal/portfolio-contract/src/resolver/types.ts';

import type { CosmosRestClient } from './cosmos-rest-client.ts';
import { resolvePendingTx } from './resolver.ts';
import type { EvmProviders, UsdcAddresses } from './support.ts';
import { watchGmp, watchHistoicalGmp } from './watchers/gmp-watcher.ts';
import {
  watchCctpTransfer,
  watchHistoricalCctp,
} from './watchers/cctp-watcher.ts';
import {
  watchHistoricalNobleTransfer,
  watchNobleTransfer,
} from './watchers/noble-watcher.ts';

export type EvmChain = keyof typeof AxelarChain;

export type EvmContext = {
  cosmosRest: CosmosRestClient;
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

type CctpTx = PendingTx & { type: typeof TxType.CCTP_TO_EVM; amount: bigint };
type GmpTx = PendingTx & { type: typeof TxType.GMP };
type NobleWithdrawTx = PendingTx & {
  type: typeof TxType.CCTP_TO_NOBLE;
  amount: bigint;
};

type LiveWatchOpts = { mode: 'live'; timeoutMs: number };
type HistoryWatchOpts = { mode: 'history'; publishTimeMs: number };
type WatchOpts = LiveWatchOpts | HistoryWatchOpts;

export type PendingTxMonitor<
  T extends PendingTx = PendingTx,
  C = EvmContext,
> = {
  watch: (
    ctx: C,
    tx: T,
    log: (...args: unknown[]) => void,
    opts: WatchOpts,
  ) => Promise<void>;
};

type MonitorRegistry = {
  [TxType.CCTP_TO_EVM]: PendingTxMonitor<CctpTx, EvmContext>;
  [TxType.GMP]: PendingTxMonitor<GmpTx, EvmContext>;
  [TxType.CCTP_TO_NOBLE]: PendingTxMonitor<NobleWithdrawTx, EvmContext>;
};

const cctpMonitor: PendingTxMonitor<CctpTx, EvmContext> = {
  watch: async (ctx, tx, log, opts) => {
    const { txId, destinationAddress, amount } = tx;
    const logPrefix = `[${txId}]`;

    // Parse destinationAddress format: 'eip155:42161:0x126cf3AC9ea12794Ff50f56727C7C66E26D9C092'
    const { namespace, reference, accountAddress } =
      parseAccountId(destinationAddress);
    const caipId: CaipChainId = `${namespace}:${reference}`;

    const usdcAddress =
      ctx.usdcAddresses[caipId] ||
      Fail`${logPrefix} No USDC address for chain: ${caipId}`;
    const provider =
      ctx.evmProviders[caipId] ||
      Fail`${logPrefix} No EVM provider for chain: ${caipId}`;

    let transferStatus = false;
    if (opts.mode === 'live') {
      transferStatus = await watchCctpTransfer({
        usdcAddress,
        toAddress: accountAddress as `0x${string}`,
        expectedAmount: amount,
        provider,
        log: (msg, ...args) => log(`${logPrefix} ${msg}`, ...args),
        timeoutMs: opts.timeoutMs,
      });
    } else {
      transferStatus = await watchHistoricalCctp({
        usdcAddress,
        toAddress: accountAddress as `0x${string}`,
        expectedAmount: amount,
        provider,
        publishTimeMs: opts.publishTimeMs,
        log: (msg, ...args) => log(`${logPrefix} ${msg}`, ...args),
      });
    }

    await resolvePendingTx({
      signingSmartWalletKit: ctx.signingSmartWalletKit,
      txId,
      status: transferStatus ? TxStatus.SUCCESS : TxStatus.FAILED,
    });

    log(`${logPrefix} CCTP tx resolved`);
  },
};

const gmpMonitor: PendingTxMonitor<GmpTx, EvmContext> = {
  watch: async (ctx, tx, log, opts) => {
    const { txId, destinationAddress } = tx;
    const logPrefix = `[${txId}]`;

    // Parse destinationAddress format: 'eip155:42161:0x126cf3AC9ea12794Ff50f56727C7C66E26D9C092'
    const { namespace, reference, accountAddress } =
      parseAccountId(destinationAddress);
    const caipId: CaipChainId = `${namespace}:${reference}`;
    caipId in ctx.evmProviders ||
      Fail`${logPrefix} No EVM provider for chain: ${caipId}`;

    const provider = ctx.evmProviders[caipId] as JsonRpcProvider;

    let transferStatus = false;
    if (opts.mode === 'live') {
      transferStatus = await watchGmp({
        provider,
        contractAddress: accountAddress as `0x${string}`,
        txId,
        log: (msg, ...args) => log(`${logPrefix} ${msg}`, ...args),
        timeoutMs: opts.timeoutMs,
      });
    } else {
      transferStatus = await watchHistoicalGmp({
        provider,
        contractAddress: accountAddress as `0x${string}`,
        txId,
        publishTimeMs: opts.publishTimeMs,
        log: (msg, ...args) => log(`${logPrefix} ${msg}`, ...args),
      });
    }

    await resolvePendingTx({
      signingSmartWalletKit: ctx.signingSmartWalletKit,
      txId,
      status: transferStatus ? TxStatus.SUCCESS : TxStatus.FAILED,
    });

    log(`${logPrefix} GMP tx resolved`);
  },
};

const nobleWithdrawMonitor: PendingTxMonitor<NobleWithdrawTx, EvmContext> = {
  watch: async (ctx, tx, log, opts) => {
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

    let transferStatus = false;
    if (opts.mode === 'live') {
      transferStatus = await watchNobleTransfer({
        cosmosRest: ctx.cosmosRest,
        watchAddress: nobleAddress,
        expectedAmount: amount,
        expectedDenom,
        chainKey: 'noble',
        log: (msg, ...args) => log(`${logPrefix} ${msg}`, ...args),
        timeoutMs: opts.timeoutMs,
      });
    } else {
      transferStatus = await watchHistoricalNobleTransfer({
        cosmosRest: ctx.cosmosRest,
        watchAddress: nobleAddress,
        expectedAmount: amount,
        expectedDenom,
        chainKey: 'noble',
        log: (msg, ...args) => log(`${logPrefix} ${msg}`, ...args),
      });
    }

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

export type HandlePendingTxOpts = {
  log?: (...args: unknown[]) => void;
  registry?: MonitorRegistry;
  timeoutMs?: number;
  mode?: 'live' | 'history';
  publishTimeMs?: number;
} & EvmContext;

export const handlePendingTx = async (
  tx: PendingTx,
  {
    log = () => {},
    registry = createMonitorRegistry(),
    timeoutMs = 300000, // 5 min
    mode = 'live',
    publishTimeMs,
    ...evmCtx
  }: HandlePendingTxOpts,
) => {
  await null;
  const logPrefix = `[${tx.txId}]`;
  log(`${logPrefix} handling ${tx.type} tx`);

  const monitor = registry[tx.type] as PendingTxMonitor<PendingTx, EvmContext>;
  monitor || Fail`${logPrefix} No monitor registered for tx type: ${tx.type}`;

  if (mode === 'history') {
    publishTimeMs || Fail`${logPrefix} publishTimeMs required in history mode`;
    await monitor.watch(evmCtx, tx, log, {
      mode: 'history',
      publishTimeMs: publishTimeMs as number,
    });
  } else {
    await monitor.watch(evmCtx, tx, log, { mode: 'live', timeoutMs });
  }
};
