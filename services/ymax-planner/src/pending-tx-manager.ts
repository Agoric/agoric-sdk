import type { WebSocketProvider } from 'ethers';

import { Fail } from '@endo/errors';

import type { SigningSmartWalletKit } from '@agoric/client-utils';
import type { CaipChainId } from '@agoric/orchestration';
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
import {
  waitForBlock,
  type EvmProviders,
  type UsdcAddresses,
} from './support.ts';
import { watchGmp, lookBackGmp } from './watchers/gmp-watcher.ts';
import { watchCctpTransfer, lookBackCctp } from './watchers/cctp-watcher.ts';
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

type LiveWatchOpts = { mode: 'live'; timeoutMs: number };
type LookBackWatchOpts = {
  mode: 'lookback';
  publishTimeMs: number;
  timeoutMs: number;
};
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
};

const cctpMonitor: PendingTxMonitor<CctpTx, EvmContext> = {
  watch: async (ctx, tx, log, opts) => {
    await null;

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

    let transferStatus: boolean | undefined;

    if (opts.mode === 'live') {
      transferStatus = await watchCctpTransfer({
        ...watchArgs,
        timeoutMs: opts.timeoutMs,
      });
    } else {
      // Lookback mode with concurrent live watching
      // Start live mode now in case the txId has not yet appeared
      const abortController = new AbortController();
      const liveResultP = watchCctpTransfer({
        ...watchArgs,
        timeoutMs: opts.timeoutMs,
        signal: abortController.signal,
      });
      void liveResultP.then(found => {
        if (found) {
          log(`${logPrefix} Live mode completed`);
          abortController.abort();
        }
      });

      await null;
      // Wait for at least one block to ensure overlap between lookback and live mode
      const currentBlock = await provider.getBlockNumber();
      await waitForBlock(provider, currentBlock + 1);

      // Scan historical blocks
      transferStatus = await lookBackCctp({
        ...watchArgs,
        publishTimeMs: opts.publishTimeMs,
        chainId: caipId,
        signal: abortController.signal,
      });

      if (transferStatus) {
        // Found in lookback, cancel live mode
        log(`${logPrefix} Lookback found transaction`);
        abortController.abort();
      } else {
        // Not found in lookback, rely on live mode
        log(
          `${logPrefix} Lookback completed without finding transaction, waiting for live mode`,
        );
        transferStatus = await liveResultP;
      }
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
    await null;

    const { txId, destinationAddress } = tx;
    const logPrefix = `[${txId}]`;

    // Parse destinationAddress format: 'eip155:42161:0x126cf3AC9ea12794Ff50f56727C7C66E26D9C092'
    const { namespace, reference, accountAddress } =
      parseAccountId(destinationAddress);
    const caipId: CaipChainId = `${namespace}:${reference}`;
    caipId in ctx.evmProviders ||
      Fail`${logPrefix} No EVM provider for chain: ${caipId}`;

    const provider = ctx.evmProviders[caipId] as WebSocketProvider;

    const watchArgs = {
      provider,
      contractAddress: accountAddress as `0x${string}`,
      txId,
      log: (msg, ...args) => log(`${logPrefix} ${msg}`, ...args),
    };

    let transferStatus: boolean | undefined;

    if (opts.mode === 'live') {
      transferStatus = await watchGmp({
        ...watchArgs,
        timeoutMs: opts.timeoutMs,
      });
    } else {
      // Lookback mode with concurrent live watching
      // Start live mode now in case the txId has not yet appeared
      const abortController = new AbortController();
      const liveResultP = watchGmp({
        ...watchArgs,
        timeoutMs: opts.timeoutMs,
        signal: abortController.signal,
      });
      void liveResultP.then(found => {
        if (found) {
          log(`${logPrefix} Live mode completed`);
          abortController.abort();
        }
      });

      await null;
      // Wait for at least one block to ensure overlap between lookback and live mode
      const currentBlock = await provider.getBlockNumber();
      await waitForBlock(provider, currentBlock + 1);

      // Scan historical blocks
      transferStatus = await lookBackGmp({
        ...watchArgs,
        publishTimeMs: opts.publishTimeMs,
        chainId: caipId,
        signal: abortController.signal,
      });

      if (transferStatus) {
        // Found in lookback, cancel live mode
        log(`${logPrefix} Lookback found transaction`);
        abortController.abort();
      } else {
        // Not found in lookback, rely on live mode
        log(
          `${logPrefix} Lookback completed without finding transaction, waiting for live mode`,
        );
        transferStatus = await liveResultP;
      }
    }

    await resolvePendingTx({
      signingSmartWalletKit: ctx.signingSmartWalletKit,
      txId,
      status: transferStatus ? TxStatus.SUCCESS : TxStatus.FAILED,
    });

    log(`${logPrefix} GMP tx resolved`);
  },
};

const createMonitorRegistry = (): MonitorRegistry => ({
  [TxType.CCTP_TO_EVM]: cctpMonitor,
  [TxType.GMP]: gmpMonitor,
});

export type HandlePendingTxOpts = {
  cosmosRpc: CosmosRPCClient;
  log?: (...args: unknown[]) => void;
  error?: (...args: unknown[]) => void;
  marshaller: SigningSmartWalletKit['marshaller'];
  registry?: MonitorRegistry;
  timeoutMs?: number;
  vstoragePathPrefixes: {
    portfoliosPathPrefix: string;
    pendingTxPathPrefix: string;
  };
} & EvmContext;

export const TX_TIMEOUT_MS = 30 * 60 * 1000; // 30 min
export const handlePendingTx = async (
  tx: PendingTx,
  {
    log = () => {},
    registry = createMonitorRegistry(),
    timeoutMs = TX_TIMEOUT_MS,
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
      timeoutMs,
    });
  } else {
    await monitor.watch(evmCtx, tx, log, { mode: 'live', timeoutMs });
  }
};
