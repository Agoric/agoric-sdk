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
import type { PendingTx } from '@aglocal/portfolio-contract/src/resolver/types.ts';
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

export type EvmChain = keyof typeof AxelarChain;

export type EvmContext = {
  cosmosRest: CosmosRestClient;
  usdcAddresses: UsdcAddresses['mainnet' | 'testnet'];
  evmProviders: EvmProviders;
  signingSmartWalletKit: SigningSmartWalletKit;
  fetch: typeof fetch;
  kvStore: KVStore;
  makeAbortController: MakeAbortController;
  axelarApiUrl: string;
};

export type GmpTransfer = {
  lcaAddr: string;
  destinationChain: AxelarId;
  contractAddress: `0x${string}`;
};

type CctpTx = PendingTx & { type: typeof TxType.CCTP_TO_EVM; amount: bigint };
type GmpTx = PendingTx & { type: typeof TxType.GMP };
type MakeAccountTx = PendingTx & { type: typeof TxType.MAKE_ACCOUNT };

type LiveWatchOpts = { mode: 'live'; timeoutMs: number; signal: AbortSignal };
type LookBackWatchOpts = {
  mode: 'lookback';
  publishTimeMs: number;
  timeoutMs: number;
  signal: AbortSignal;
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

    if (opts.signal.aborted) {
      log(`${logPrefix} CCTP watch aborted before starting`);
      return;
    }

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
        signal: opts.signal,
        kvStore: ctx.kvStore,
        txId,
      });
    } else {
      // Lookback mode with concurrent live watching
      // Start live mode now in case the txId has not yet appeared
      const abortController = new AbortController();

      // If external signal is aborted, abort internal controller
      const handleExternalAbort = () => {
        log(`${logPrefix} External abort signal received`);
        abortController.abort();
      };
      opts.signal.addEventListener('abort', handleExternalAbort);

      try {
        const liveResultP = watchCctpTransfer({
          ...watchArgs,
          timeoutMs: opts.timeoutMs,
          signal: abortController.signal,
          kvStore: ctx.kvStore,
          txId,
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
          kvStore: ctx.kvStore,
          txId,
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
      } finally {
        opts.signal.removeEventListener('abort', handleExternalAbort);
      }
    }

    if (opts.signal.aborted) {
      return;
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

    if (opts.signal.aborted) {
      log(`${logPrefix} GMP watch aborted before starting`);
      return;
    }

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

    let transferResult:
      | { found: boolean; rejectionReason?: string }
      | undefined;

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
      const abortController = new AbortController();

      // If external signal is aborted, abort internal controller
      const handleExternalAbort = () => {
        log(`${logPrefix} External abort signal received`);
        abortController.abort();
      };
      opts.signal.addEventListener('abort', handleExternalAbort);

      try {
        const liveResultP = watchGmp({
          ...watchArgs,
          timeoutMs: opts.timeoutMs,
          signal: abortController.signal,
          kvStore: ctx.kvStore,
          makeAbortController: ctx.makeAbortController,
          axelarApiUrl: ctx.axelarApiUrl,
          fetch: ctx.fetch,
        });
        void liveResultP
          .then(async found => {
            log(`${logPrefix} Live mode completed`);
            await resolvePendingTx({
              signingSmartWalletKit: ctx.signingSmartWalletKit,
              txId,
              status: found ? TxStatus.SUCCESS : TxStatus.FAILED,
            });
            abortController.abort();
          })
          .catch(error => {
            // if promise was aborted. no action needed
            if (error !== WATCH_GMP_ABORTED) {
              throw error;
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
          kvStore: ctx.kvStore,
          makeAbortController: ctx.makeAbortController,
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
      } finally {
        opts.signal.removeEventListener('abort', handleExternalAbort);
      }
    }

    if (opts.signal.aborted) {
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

    log(`${logPrefix} GMP tx resolved`);
  },
};

const makeAccountMonitor: PendingTxMonitor<MakeAccountTx, EvmContext> = {
  watch: async (ctx, tx, log, opts) => {
    await null;

    const { txId, expectedAddr, destinationAddress } = tx;
    const logPrefix = `[${txId}]`;

    if (opts.signal.aborted) {
      log(`${logPrefix} MAKE_ACCOUNT watch aborted before starting`);
      return;
    }

    expectedAddr || Fail`${logPrefix} Missing expectedAddr`;
    destinationAddress ||
      Fail`${logPrefix} Missing destinationAddress (factory)`;

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

    let walletCreated: boolean | undefined;

    if (opts.mode === 'live') {
      walletCreated = await watchSmartWalletTx({
        ...watchArgs,
        timeoutMs: opts.timeoutMs,
        signal: opts.signal,
      });
    } else {
      const abortController = new AbortController();

      // If external signal is aborted, abort internal controller
      const handleExternalAbort = () => {
        log(`${logPrefix} External abort signal received`);
        abortController.abort();
      };
      opts.signal.addEventListener('abort', handleExternalAbort);

      try {
        const liveResultP = watchSmartWalletTx({
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

        const currentBlock = await provider.getBlockNumber();
        await waitForBlock(provider, currentBlock + 1);

        walletCreated = await lookBackSmartWalletTx({
          ...watchArgs,
          kvStore: ctx.kvStore,
          txId,
          publishTimeMs: opts.publishTimeMs,
          chainId: caipId,
          signal: abortController.signal,
        });

        if (walletCreated) {
          log(`${logPrefix} Lookback found wallet creation`);
          abortController.abort();
        } else {
          log(
            `${logPrefix} Lookback completed without finding wallet creation, waiting for live mode`,
          );
          walletCreated = await liveResultP;
        }
      } finally {
        opts.signal.removeEventListener('abort', handleExternalAbort);
      }
    }

    if (opts.signal.aborted) {
      return;
    }

    await resolvePendingTx({
      signingSmartWalletKit: ctx.signingSmartWalletKit,
      txId,
      status: walletCreated ? TxStatus.SUCCESS : TxStatus.FAILED,
    });

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
} & EvmContext;

export const TX_TIMEOUT_MS = 30 * 60 * 1000; // 30 min
export const handlePendingTx = async (
  tx: PendingTx,
  { log = () => {}, timeoutMs = TX_TIMEOUT_MS, ...evmCtx }: HandlePendingTxOpts,
  txTimestampMs: number | undefined,
  signal: AbortSignal,
) => {
  await null;
  const logPrefix = `[${tx.txId}]`;
  log(`${logPrefix} handling ${tx.type} tx`);

  if (signal.aborted) {
    log(`${logPrefix} watch aborted before starting`);
    return;
  }

  const monitor =
    MONITORS.get(tx.type) ||
    Fail`${logPrefix} No monitor registered for tx type: ${tx.type}`;

  if (txTimestampMs) {
    await monitor.watch(evmCtx, tx, log, {
      mode: 'lookback',
      publishTimeMs: txTimestampMs,
      timeoutMs,
      signal,
    });
  } else {
    await monitor.watch(evmCtx, tx, log, { mode: 'live', timeoutMs, signal });
  }
};
