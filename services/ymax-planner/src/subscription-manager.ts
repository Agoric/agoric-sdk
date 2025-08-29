import type { AxelarId } from '@aglocal/portfolio-contract/src/portfolio.contract.ts';
import type { SigningSmartWalletKit } from '@agoric/client-utils';
import type { AxelarChain } from '@agoric/portfolio-api/src/constants.js';
import { TxStatus } from '@aglocal/portfolio-contract/src/resolver/constants.js';
import { watchGmp } from './watchers/gmp-watcher.ts';
import { resolvePendingTx } from './resolver.ts';
import { watchCctpTransfer } from './watchers/cctp-watcher.ts';
import type {
  PublishedTx,
  TxId,
} from '@aglocal/portfolio-contract/src/resolver/types.ts';
import type {
  AxelarChainIdMap,
  EvmProviders,
  UsdcAddresses,
} from './support.ts';
import type { CaipChainId } from '@agoric/orchestration';

export type EvmChain = keyof typeof AxelarChain;

export type EvmContext = {
  axelarQueryApi: string;
  usdcAddresses: UsdcAddresses['mainnet' | 'testnet'];
  axelarChainIds: AxelarChainIdMap[keyof AxelarChainIdMap];
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
 * Subscription state machine:
 * pending -> success (when cross-chain operation completes successfully)
 * pending -> failed (when operation fails or times out)
 *
 * Terminal states: success and timeout never transition to other states.
 */
export type Subscription = {
  txId: TxId;
} & PublishedTx;

type CctpSubscription = Subscription & { type: 'cctp' };
type GmpSubscription = Subscription & { type: 'gmp' };

export type SubscriptionMonitor<T extends Subscription = Subscription> = {
  watch: (
    ctx: EvmContext,
    subscription: T,
    log: (...args: unknown[]) => void,
  ) => Promise<void>;
};

type MonitorRegistry = {
  cctp: SubscriptionMonitor<CctpSubscription>;
  gmp: SubscriptionMonitor<GmpSubscription>;
};

const cctpMonitor: SubscriptionMonitor<CctpSubscription> = {
  watch: async (ctx, subscription, log) => {
    const { txId, destinationAddress, amount } = subscription;
    const logPrefix = `[${txId}]`;

    log(`${logPrefix} handling cctp subscription`);

    // Parse destinationAddress format: 'eip155:42161:0x126cf3AC9ea12794Ff50f56727C7C66E26D9C092'
    const [namespace, chainId, receiver] = destinationAddress.split(':');
    const caipId: CaipChainId = `${namespace}:${chainId}`;
    const usdcAddress = ctx.usdcAddresses[caipId];
    const provider = ctx.evmProviders[caipId];
    if (!provider) {
      throw Error(
        `${logPrefix} No EVM provider configured for chain: ${caipId}`,
      );
    }

    const transferStatus = await watchCctpTransfer({
      usdcAddress,
      watchAddress: receiver,
      expectedAmount: amount,
      provider,
      log: (msg, ...args) => log(`${logPrefix} ${msg}`, ...args),
    });

    await resolvePendingTx({
      signingSmartWalletKit: ctx.signingSmartWalletKit,
      txId,
      status: transferStatus ? TxStatus.SUCCESS : TxStatus.FAILED,
    });

    log(`${logPrefix} CCTP subscription resolved`);
  },
};

const gmpMonitor: SubscriptionMonitor<GmpSubscription> = {
  watch: async (ctx, subscription, log) => {
    const { txId, destinationAddress } = subscription;
    const logPrefix = `[${txId}]`;

    // Parse destinationAddress format: 'eip155:42161:0x126cf3AC9ea12794Ff50f56727C7C66E26D9C092'
    const [namespace, chainId, addr] = destinationAddress.split(':');
    const caipId: CaipChainId = `${namespace}:${chainId}`;
    const axelarChainId = ctx.axelarChainIds[caipId];

    log(`${logPrefix} handling gmp subscription`);

    const res = await watchGmp({
      url: ctx.axelarQueryApi,
      fetch: ctx.fetch,
      params: {
        sourceChain: 'agoric',
        destinationChain: axelarChainId as unknown as string,
        contractAddress: addr as `0x${string}`,
      },
      txId,
      log: (msg, ...args) => log(`${logPrefix} ${msg}`, ...args),
    });

    await resolvePendingTx({
      signingSmartWalletKit: ctx.signingSmartWalletKit,
      txId,
      status: res.success ? TxStatus.SUCCESS : TxStatus.FAILED,
    });

    log(`${logPrefix} GMP subscription resolved`);
  },
};

const createMonitorRegistry = (): MonitorRegistry => ({
  cctp: cctpMonitor,
  gmp: gmpMonitor,
});

export const handleSubscription = async (
  ctx: EvmContext,
  subscription: Subscription,
  log: (...args: unknown[]) => void = () => {},
  registry: MonitorRegistry = createMonitorRegistry(),
) => {
  await null;
  const logPrefix = `[${subscription.txId}]`;
  log(`${logPrefix} handling ${subscription.type} subscription`);

  const monitor = registry[subscription.type] as SubscriptionMonitor;

  if (!monitor) {
    throw Error(
      `${logPrefix} No monitor registered for subscription type: ${subscription.type}`,
    );
  }

  await monitor.watch(ctx, subscription, log);
};
