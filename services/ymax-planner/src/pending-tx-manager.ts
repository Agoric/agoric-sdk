import type { WebSocketProvider } from 'ethers';

import { Fail } from '@endo/errors';

import type { CaipChainId } from '@agoric/orchestration';
import { parseAccountId } from '@agoric/orchestration/src/utils/address.js';
import type { AxelarChain } from '@agoric/portfolio-api/src/constants.js';
import type { SigningSmartWalletKit } from '@agoric/client-utils';

import type { AxelarId } from '@aglocal/portfolio-contract/src/portfolio.contract.ts';
import {
  TxStatus,
  TxType,
} from '@aglocal/portfolio-contract/src/resolver/constants.js';
import type {
  PendingTx,
  TxId,
} from '@aglocal/portfolio-contract/src/resolver/types.ts';
import type { KVStore } from '@agoric/internal/src/kv-store.js';

import type { CosmosRestClient } from './cosmos-rest-client.ts';
import type { CosmosRPCClient } from './cosmos-rpc.ts';
import { resolvePendingTx } from './resolver.ts';
import { waitForBlock } from './support.ts';
import type {
  EvmProviders,
  MakeAbortController,
  UsdcAddresses,
} from './support.ts';
import { lookBackCctp, watchCctpTransfer } from './watchers/cctp-watcher.ts';
import {
  lookBackGmp,
  WATCH_GMP_ABORTED,
  watchGmp,
} from './watchers/gmp-watcher.ts';
import {
  watchSmartWalletTx,
  lookBackSmartWalletTx,
} from './watchers/wallet-watcher.ts';
import type { YdsNotifier } from './yds-notifier.ts';

export type EvmChain = keyof typeof AxelarChain;

export type WatcherResult = {
  found: boolean;
  txHash?: string;
};

export type GmpWatcherResult = WatcherResult & {
  rejectionReason?: string;
};

export type EvmContext = {
  cosmosRest: CosmosRestClient;
  usdcAddresses: UsdcAddresses['mainnet' | 'testnet'];
  evmProviders: EvmProviders;
  signingSmartWalletKit: SigningSmartWalletKit;
  fetch: typeof fetch;
  kvStore: KVStore;
  makeAbortController: MakeAbortController;
  axelarApiUrl: string;
  ydsNotifier: YdsNotifier;
};

export type GmpTransfer = {
  lcaAddr: string;
  destinationChain: AxelarId;
  contractAddress: `0x${string}`;
};

type CctpTx = PendingTx & { type: typeof TxType.CCTP_TO_EVM; amount: bigint };
type GmpTx = PendingTx & { type: typeof TxType.GMP };
type MakeAccountTx = PendingTx & { type: typeof TxType.MAKE_ACCOUNT };

type LiveWatchOpts = { mode: 'live'; timeoutMs: number; signal?: AbortSignal };
type LookBackWatchOpts = {
  mode: 'lookback';
  publishTimeMs: number;
  timeoutMs: number;
  signal?: AbortSignal;
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

const cctpMonitor: PendingTxMonitor<CctpTx, EvmContext> = {
  watch: async (ctx, tx, log, opts) => {
    await null;

    const { txId, destinationAddress, amount } = tx;
    const logPrefix = `[${txId}]`;

    if (opts.signal?.aborted) {
      log(`${logPrefix} CCTP watch aborted before starting`);
      return;
    }

    // Parse destinationAddress format: 'eip155:42161:0x126cf3AC9ea12794Ff50f56727C7C66E26D9C092'
    assert(destinationAddress, `${logPrefix} Missing destinationAddress`);
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

    let transferResult: WatcherResult | undefined;

    if (opts.mode === 'live') {
      transferResult = await watchCctpTransfer({
        ...watchArgs,
        timeoutMs: opts.timeoutMs,
        signal: opts.signal,
        kvStore: ctx.kvStore,
        txId,
      });
    } else {
      // Lookback mode with concurrent live watching
      // Start live mode now in case the txId has not yet appeared
      const abortController = ctx.makeAbortController(
        undefined,
        opts.signal ? [opts.signal] : undefined,
      );

      const liveResultP = watchCctpTransfer({
        ...watchArgs,
        timeoutMs: opts.timeoutMs,
        signal: abortController.signal,
        kvStore: ctx.kvStore,
        txId,
      });
      void liveResultP.then(result => {
        if (result.found) {
          log(`${logPrefix} Live mode completed`);
          abortController.abort();
        }
      });

      await null;
      // Wait for at least one block to ensure overlap between lookback and live mode
      const currentBlock = await provider.getBlockNumber();
      await waitForBlock(provider, currentBlock + 1);

      // Scan historical blocks
      transferResult = await lookBackCctp({
        ...watchArgs,
        publishTimeMs: opts.publishTimeMs,
        chainId: caipId,
        signal: abortController.signal,
        kvStore: ctx.kvStore,
        txId,
      });

      if (transferResult.found) {
        // Found in lookback, cancel live mode
        const reason = `${logPrefix} Lookback found transaction`;
        log(reason);
        abortController.abort(reason);
      } else {
        // Not found in lookback, rely on live mode
        log(
          `${logPrefix} Lookback completed without finding transaction, waiting for live mode`,
        );
        transferResult = await liveResultP;
      }
    }

    if (opts.signal?.aborted) {
      return;
    }

    await resolvePendingTx({
      signingSmartWalletKit: ctx.signingSmartWalletKit,
      txId,
      status: transferResult?.found ? TxStatus.SUCCESS : TxStatus.FAILED,
    });

    if (transferResult?.txHash) {
      await ctx.ydsNotifier.notifySettlement(txId, transferResult.txHash);
    }

    log(`${logPrefix} CCTP tx resolved`);
  },
};

const gmpMonitor: PendingTxMonitor<GmpTx, EvmContext> = {
  watch: async (ctx, tx, log, opts) => {
    await null;

    const { txId, destinationAddress } = tx;
    const logPrefix = `[${txId}]`;

    if (opts.signal?.aborted) {
      log(`${logPrefix} GMP watch aborted before starting`);
      return;
    }

    // Parse destinationAddress format: 'eip155:42161:0x126cf3AC9ea12794Ff50f56727C7C66E26D9C092'
    assert(destinationAddress, `${logPrefix} Missing destinationAddress`);
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

    let transferResult: GmpWatcherResult | undefined;

    if (opts.mode === 'live') {
      transferResult = await watchGmp({
        ...watchArgs,
        timeoutMs: opts.timeoutMs,
        signal: opts.signal,
        kvStore: ctx.kvStore,
        makeAbortController: ctx.makeAbortController,
        axelarApiUrl: ctx.axelarApiUrl,
        fetch: ctx.fetch,
      });
    } else {
      // Lookback mode with concurrent live watching
      // Start live mode now in case the txId has not yet appeared
      const abortController = ctx.makeAbortController(
        undefined,
        opts.signal ? [opts.signal] : undefined,
      );

      const liveResultP = watchGmp({
        ...watchArgs,
        timeoutMs: opts.timeoutMs,
        signal: abortController.signal,
        kvStore: ctx.kvStore,
        makeAbortController: ctx.makeAbortController,
        axelarApiUrl: ctx.axelarApiUrl,
        fetch: ctx.fetch,
      });

      // Attach handler to abort lookback if live mode completes first with
      // a definitive result. This handler does NOT resolve the transaction -
      // resolution happens once at the end to prevent duplicate resolutions.
      void liveResultP
        .then(result => {
          // Abort lookback only if live mode has a definitive answer:
          // - Transaction found successfully (result.found === true)
          // - Transaction found but failed (result.rejectionReason present)
          // If neither (just timed out), let lookback continue - it might find it.
          if (result.found || result.rejectionReason) {
            const reason = `${logPrefix} Live mode completed`;
            log(reason);
            abortController.abort(reason);
          }
        })
        .catch(error => {
          // If lookback aborted live mode, no action needed
          if (error !== WATCH_GMP_ABORTED) {
            throw error;
          }
        });

      await null;
      // Wait for at least one block to ensure overlap between lookback and live mode
      const currentBlock = await provider.getBlockNumber();
      await waitForBlock(provider, currentBlock + 1);

      // Scan historical blocks
      const lookBackResult = await lookBackGmp({
        ...watchArgs,
        publishTimeMs: opts.publishTimeMs,
        chainId: caipId,
        signal: abortController.signal,
        kvStore: ctx.kvStore,
        makeAbortController: ctx.makeAbortController,
      });

      // Determine which result to use based on what completed successfully
      if (lookBackResult.found) {
        // Found in lookback, cancel live mode
        transferResult = lookBackResult;
        const reason = `${logPrefix} Lookback found transaction`;
        log(reason);
        abortController.abort(reason);
      } else {
        // Not found in lookback, rely on live mode
        log(
          `${logPrefix} Lookback completed without finding transaction, waiting for live mode`,
        );
        transferResult = await liveResultP;
      }
    }

    if (opts.signal?.aborted) {
      return;
    }

    await resolvePendingTx({
      signingSmartWalletKit: ctx.signingSmartWalletKit,
      txId,
      status: transferResult?.found ? TxStatus.SUCCESS : TxStatus.FAILED,
      ...(transferResult?.rejectionReason
        ? { rejectionReason: transferResult.rejectionReason }
        : {}),
    });

    if (transferResult?.txHash) {
      await ctx.ydsNotifier.notifySettlement(txId, transferResult.txHash);
    }

    log(`${logPrefix} GMP tx resolved`);
  },
};

const makeAccountMonitor: PendingTxMonitor<MakeAccountTx, EvmContext> = {
  watch: async (ctx, tx, log, opts) => {
    await null;

    const { txId, expectedAddr, destinationAddress } = tx;
    const logPrefix = `[${txId}]`;

    if (opts.signal?.aborted) {
      log(`${logPrefix} MAKE_ACCOUNT watch aborted before starting`);
      return;
    }

    expectedAddr || Fail`${logPrefix} Missing expectedAddr`;
    destinationAddress ||
      Fail`${logPrefix} Missing destinationAddress (factory)`;

    // Parse destinationAddress format: 'eip155:42161:0x126cf3AC9ea12794Ff50f56727C7C66E26D9C092'
    assert(destinationAddress, `${logPrefix} Missing destinationAddress`);
    const {
      namespace,
      reference,
      accountAddress: factoryAddr,
    } = parseAccountId(destinationAddress);
    const caipId: CaipChainId = `${namespace}:${reference}`;

    const provider =
      ctx.evmProviders[caipId] ||
      Fail`${logPrefix} No EVM provider for chain: ${caipId}`;

    const watchArgs = {
      factoryAddr: factoryAddr as `0x${string}`,
      provider,
      expectedAddr: expectedAddr as `0x${string}`,
      log: (msg, ...args) => log(logPrefix, msg, ...args),
    };

    let walletResult: WatcherResult | undefined;

    if (opts.mode === 'live') {
      walletResult = await watchSmartWalletTx({
        ...watchArgs,
        timeoutMs: opts.timeoutMs,
        signal: opts.signal,
        txId,
      });
    } else {
      const abortController = ctx.makeAbortController(
        undefined,
        opts.signal ? [opts.signal] : undefined,
      );

      const liveResultP = watchSmartWalletTx({
        ...watchArgs,
        timeoutMs: opts.timeoutMs,
        signal: abortController.signal,
        txId,
      });
      void liveResultP.then(result => {
        if (result.found) {
          log(`${logPrefix} Live mode completed`);
          abortController.abort();
        }
      });

      await null;

      const currentBlock = await provider.getBlockNumber();
      await waitForBlock(provider, currentBlock + 1);

      walletResult = await lookBackSmartWalletTx({
        ...watchArgs,
        kvStore: ctx.kvStore,
        txId,
        publishTimeMs: opts.publishTimeMs,
        chainId: caipId,
        signal: abortController.signal,
      });

      if (walletResult.found) {
        log(`${logPrefix} Lookback found wallet creation`);
        abortController.abort();
      } else {
        log(
          `${logPrefix} Lookback completed without finding wallet creation, waiting for live mode`,
        );
        walletResult = await liveResultP;
      }
    }

    if (opts.signal?.aborted) {
      return;
    }

    await resolvePendingTx({
      signingSmartWalletKit: ctx.signingSmartWalletKit,
      txId,
      status: walletResult?.found ? TxStatus.SUCCESS : TxStatus.FAILED,
    });

    if (walletResult?.txHash) {
      await ctx.ydsNotifier.notifySettlement(txId, walletResult.txHash);
    }

    log(`${logPrefix} MAKE_ACCOUNT tx resolved`);
  },
};

const MONITORS = new Map<TxType, PendingTxMonitor<PendingTx, EvmContext>>([
  [TxType.CCTP_TO_EVM, cctpMonitor],
  [TxType.GMP, gmpMonitor],
  [TxType.MAKE_ACCOUNT, makeAccountMonitor],
]);

export type HandlePendingTxOpts = {
  cosmosRpc: CosmosRPCClient;
  log?: (...args: unknown[]) => void;
  error?: (...args: unknown[]) => void;
  marshaller: SigningSmartWalletKit['marshaller'];
  timeoutMs?: number;
  vstoragePathPrefixes: {
    portfoliosPathPrefix: string;
    pendingTxPathPrefix: string;
  };
  txTimestampMs?: number;
  signal?: AbortSignal;
  pendingTxAbortControllers: Map<TxId, AbortController>;
} & EvmContext;

export const TX_TIMEOUT_MS = 30 * 60 * 1000; // 30 min
export const handlePendingTx = async (
  tx: PendingTx,
  {
    log = () => {},
    error = () => {},
    timeoutMs = TX_TIMEOUT_MS,
    txTimestampMs,
    signal,
    ...evmCtx
  }: HandlePendingTxOpts,
) => {
  await null;
  const logPrefix = `[${tx.txId}]`;
  log(`${logPrefix} handling ${tx.type} tx`);

  const monitor =
    MONITORS.get(tx.type) ||
    Fail`${logPrefix} No monitor registered for tx type: ${tx.type}`;

  const watchOpts: Omit<WatchOpts, 'mode'> = { timeoutMs, signal };
  try {
    if (txTimestampMs) {
      await monitor.watch(evmCtx, tx, log, {
        mode: 'lookback',
        publishTimeMs: txTimestampMs,
        ...watchOpts,
      });
    } else {
      await monitor.watch(evmCtx, tx, log, { mode: 'live', ...watchOpts });
    }
  } catch (err) {
    const mode = txTimestampMs ? 'with lookback' : 'in live mode';
    error(`🚨 Failed to process pending tx ${tx.txId} ${mode}`, err);
  }
};
