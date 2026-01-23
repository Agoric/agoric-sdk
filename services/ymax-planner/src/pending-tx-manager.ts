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
import { lookBackGmp, watchGmp } from './watchers/gmp-watcher.ts';
import {
  watchSmartWalletTx,
  lookBackSmartWalletTx,
} from './watchers/wallet-watcher.ts';
import type { YdsNotifier } from './yds-notifier.ts';

export type EvmChain = keyof typeof AxelarChain;

export type WatcherResult = {
  settled: boolean;
  success?: boolean;
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
  ydsNotifier?: YdsNotifier;
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
        if (result.settled) {
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

      if (transferResult.settled) {
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

    transferResult.settled &&
      (await resolvePendingTx({
        signingSmartWalletKit: ctx.signingSmartWalletKit,
        txId,
        status:
          transferResult.success !== false ? TxStatus.SUCCESS : TxStatus.FAILED,
      }));

    if (transferResult?.txHash) {
      await ctx.ydsNotifier?.notifySettlement(txId, transferResult.txHash);
    }

    log(`${logPrefix} CCTP tx resolved`);
  },
};

const gmpMonitor: PendingTxMonitor<GmpTx, EvmContext> = {
  watch: async (ctx, tx, log, opts) => {
    await null;

    const { txId, destinationAddress, sourceAddress } = tx;
    const logPrefix = `[${txId}]`;

    if (opts.signal?.aborted) {
      log(`${logPrefix} GMP watch aborted before starting`);
      return;
    }

    // Parse destinationAddress format: 'eip155:42161:0x126cf3AC9ea12794Ff50f56727C7C66E26D9C092'
    assert(destinationAddress, `${logPrefix} Missing destinationAddress`);
    assert(sourceAddress, `${logPrefix} Missing sourceAddress`);

    const { namespace, reference, accountAddress } =
      parseAccountId(destinationAddress);
    const caipId: CaipChainId = `${namespace}:${reference}`;
    caipId in ctx.evmProviders ||
      Fail`${logPrefix} No EVM provider for chain: ${caipId}`;

    const provider = ctx.evmProviders[caipId] as WebSocketProvider;

    // Extract the address portion from sourceAddress (format: 'cosmos:agoric-3:agoric1...')
    const lcaAddress = parseAccountId(sourceAddress).accountAddress;

    const watchArgs = {
      provider,
      contractAddress: accountAddress as `0x${string}`,
      txId,
      expectedSourceAddress: lcaAddress,
      chainId: caipId,
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
      });

      // Attach handler to abort lookback if live mode completes first with
      // a definitive result. This handler does NOT resolve the transaction -
      // resolution happens once at the end to prevent duplicate resolutions.
      void liveResultP.then(result => {
        if (result.settled) {
          const reason = `${logPrefix} Live mode completed`;
          log(reason);
          abortController.abort(reason);
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
      if (lookBackResult.settled) {
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

    transferResult.settled &&
      (await resolvePendingTx({
        signingSmartWalletKit: ctx.signingSmartWalletKit,
        txId,
        status:
          transferResult.success !== false ? TxStatus.SUCCESS : TxStatus.FAILED,
      }));

    if (transferResult?.txHash) {
      await ctx.ydsNotifier?.notifySettlement(txId, transferResult.txHash);
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
        if (result.settled) {
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

      if (walletResult.settled) {
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

    walletResult.settled &&
      (await resolvePendingTx({
        signingSmartWalletKit: ctx.signingSmartWalletKit,
        txId,
        status:
          walletResult.success !== false ? TxStatus.SUCCESS : TxStatus.FAILED,
      }));

    if (walletResult?.txHash) {
      await ctx.ydsNotifier?.notifySettlement(txId, walletResult.txHash);
    }

    log(`${logPrefix} MAKE_ACCOUNT tx resolved`);
  },
};

const ibcFromAgoricMonitor: PendingTxMonitor = {
  // CAVEAT: IBC_FROM_AGORIC watch not needed - settled by contract
  watch: async (_ctx, _tx, _log, _opts) => {
    // do nothing
  },
};

const MONITORS = new Map<
  TxType,
  PendingTxMonitor<PendingTx, EvmContext> | null
>([
  [TxType.CCTP_TO_EVM, cctpMonitor],
  [TxType.GMP, gmpMonitor],
  [TxType.MAKE_ACCOUNT, makeAccountMonitor],
  [TxType.IBC_FROM_AGORIC, ibcFromAgoricMonitor],
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

  const monitor = MONITORS.get(tx.type);
  if (monitor === null) {
    // Previously logged as unhandled type, skip silently.
    return;
  }

  log(`${logPrefix} handling ${tx.type} tx`);

  if (monitor === undefined) {
    // Only alert once per unhandled type per execution, to reduce
    // operator fatigue.
    error(`🚨 ${logPrefix} No monitor registered for tx type: ${tx.type}`);
    MONITORS.set(tx.type, null);
    return;
  }

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
