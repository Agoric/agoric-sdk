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
import { watchGmp, lookBackGmp } from './watchers/gmp-watcher.ts';
import { watchCctpTransfer, lookBackCctp } from './watchers/cctp-watcher.ts';
import {
  lookBackNobleTransfer,
  watchNobleTransfer,
} from './watchers/noble-watcher.ts';
import type { CosmosRPCClient } from './cosmos-rpc.ts';

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
type LookBackWatchOpts = { mode: 'lookback'; publishTimeMs: number };
type WatchOpts = LiveWatchOpts | LookBackWatchOpts;

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

    const watchArgs = {
      usdcAddress,
      toAddress: accountAddress as `0x${string}`,
      expectedAmount: amount,
      provider,
      log: (msg, ...args) => log(logPrefix, msg, ...args),
    };
    const transferStatus = await (opts.mode === 'live'
      ? watchCctpTransfer({ ...watchArgs, timeoutMs: opts.timeoutMs })
      : lookBackCctp({ ...watchArgs, publishTimeMs: opts.publishTimeMs }));

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

    const watchArgs = {
      provider,
      contractAddress: accountAddress as `0x${string}`,
      txId,
      log: (msg, ...args) => log(`${logPrefix} ${msg}`, ...args),
    };
    const transferStatus = await (opts.mode === 'live'
      ? watchGmp({ ...watchArgs, timeoutMs: opts.timeoutMs })
      : lookBackGmp({ ...watchArgs, publishTimeMs: opts.publishTimeMs }));

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

    const { accountAddress } = parseAccountId(destinationAddress);

    const nobleAddress = accountAddress as Bech32Address;
    const expectedDenom = 'uusdc'; // TODO: find the exact denom while e2e testing

    log(
      `${logPrefix} Watching Noble withdrawal to ${nobleAddress} for ${amount} ${expectedDenom}`,
    );

    const watchArgs = {
      cosmosRest: ctx.cosmosRest,
      watchAddress: nobleAddress,
      expectedAmount: amount,
      expectedDenom,
      chainKey: 'noble',
      log: (msg, ...args) => log(`${logPrefix} ${msg}`, ...args),
    };
    const transferStatus = await (opts.mode === 'live'
      ? watchNobleTransfer({ ...watchArgs, timeoutMs: opts.timeoutMs })
      : lookBackNobleTransfer({ ...watchArgs }));

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
  cosmosRpc: CosmosRPCClient;
  log?: (...args: unknown[]) => void;
  error?: (...args: unknown[]) => void;
  marshaller: SigningSmartWalletKit['marshaller'];
  now: typeof Date.now;
  registry?: MonitorRegistry;
  timeoutMs?: number;
} & EvmContext;

export const TX_TIMEOUT_MS = 10 * 60 * 1000; // 10 min
export const handlePendingTx = async (
  tx: PendingTx,
  {
    log = () => {},
    registry = createMonitorRegistry(),
    timeoutMs = TX_TIMEOUT_MS, // 10 min
    ...evmCtx
  }: HandlePendingTxOpts,
  txTimestampMs?: number,
) => {
  await null;
  const logPrefix = `[${tx.txId}]`;
  log(`${logPrefix} handling ${tx.type} tx`);

  const monitor = registry[tx.type] as PendingTxMonitor<PendingTx, EvmContext>;
  monitor || Fail`${logPrefix} No monitor registered for tx type: ${tx.type}`;

  if (txTimestampMs) {
    await monitor.watch(evmCtx, tx, log, {
      mode: 'lookback',
      publishTimeMs: txTimestampMs,
    });
  } else {
    await monitor.watch(evmCtx, tx, log, { mode: 'live', timeoutMs });
  }
};
