import type { AxelarId } from '@aglocal/portfolio-contract/src/portfolio.contract.ts';
import type { SigningSmartWalletKit } from '@agoric/client-utils';
import type { AxelarChain } from '@agoric/portfolio-api/src/constants.js';
import { JsonRpcProvider } from 'ethers';
import { TxStatus } from '@aglocal/portfolio-contract/src/resolver/constants.js';
import { watchGmp } from './watchers/gmp-watcher.ts';
import { resolveCctpSubscription } from './resolver.ts';
import { watchCctpTransfer } from './watchers/cctp-watcher.ts';

export type EvmChain = keyof typeof AxelarChain;

export type EvmContext = {
  axelarQueryApi: string;
  evmProviders: Partial<Record<EvmChain, JsonRpcProvider>>;
  signingSmartWalletKit: SigningSmartWalletKit;
  fetch: typeof fetch;
};

type CctpTransfer = {
  amount: bigint;
  destinationAddress: string;
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
type BaseSubscription = {
  subscriptionId: string;
  status: TxStatus;
};

type SubscriptionOf<T, K extends string> = BaseSubscription & T & { type: K };

export type CctpSubscription = SubscriptionOf<CctpTransfer, 'cctp'>;
export type GmpSubscription = SubscriptionOf<GmpTransfer, 'gmp'>;

export type Subscription = CctpSubscription | GmpSubscription;

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

/* Sourced from:
 * - https://chainlist.org/
 * - https://docs.simplehash.com/reference/supported-chains-testnets
 *   (accessed on 26th August 2025)
 */
const chainIdToEvmChain: Record<string, EvmChain> = {
  // Mainnets
  '1': 'Ethereum',
  '42161': 'Arbitrum',
  '43114': 'Avalanche',
  '137': 'Polygon',
  '10': 'Optimism',
  // Testnets
  '11155111': 'Ethereum',
  '421614': 'Arbitrum',
  '43113': 'Avalanche',
  '80002': 'Polygon', // Amoy
  '11155420': 'Optimism',
};

const cctpMonitor: SubscriptionMonitor<CctpSubscription> = {
  watch: async (ctx, subscription, log) => {
    const { subscriptionId, destinationAddress, amount } = subscription;
    const logPrefix = `[${subscriptionId}]`;

    log(`${logPrefix} handling cctp subscription`);

    // Parse destinationAddress format: 'eip155:42161:0x126cf3AC9ea12794Ff50f56727C7C66E26D9C092'
    const [, chainId, receiver] = destinationAddress.split(':');
    const chain = chainIdToEvmChain[chainId];
    const provider = ctx.evmProviders[chain];

    if (!provider) {
      throw Error(
        `${logPrefix} No EVM provider configured for chain: ${chain}`,
      );
    }

    const transferStatus = await watchCctpTransfer({
      watchAddress: receiver,
      expectedAmount: amount,
      provider,
      log: (msg, ...args) => log(`${logPrefix} ${msg}`, ...args),
    });

    await resolveCctpSubscription({
      signingSmartWalletKit: ctx.signingSmartWalletKit,
      subscriptionId,
      status: transferStatus ? TxStatus.SUCCESS : TxStatus.FAILED,
      subscriptionData: subscription,
    });

    log(`${logPrefix} CCTP subscription resolved`);
  },
};

const gmpMonitor: SubscriptionMonitor<GmpSubscription> = {
  watch: async (ctx, subscription, log) => {
    const { subscriptionId, destinationChain, contractAddress } = subscription;
    const logPrefix = `[${subscriptionId}]`;

    log(`${logPrefix} handling gmp subscription`);

    const res = await watchGmp({
      url: ctx.axelarQueryApi,
      fetch: ctx.fetch,
      params: {
        sourceChain: 'agoric',
        destinationChain: destinationChain as unknown as string,
        contractAddress,
      },
      subscriptionId,
      log: (msg, ...args) => log(`${logPrefix} ${msg}`, ...args),
    });

    if (res.success) {
      log(`${logPrefix} GMP transaction executed successfully`);
      // TODO: resolve GMP subscription
    } else {
      log(`${logPrefix} GMP transaction failed or timed out`);
    }
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
  const logPrefix = `[${subscription.subscriptionId}]`;
  log(`${logPrefix} handling ${subscription.type} subscription`);

  const monitor = registry[subscription.type] as SubscriptionMonitor;

  if (!monitor) {
    throw Error(
      `${logPrefix} No monitor registered for subscription type: ${subscription.type}`,
    );
  }

  await monitor.watch(ctx, subscription, log);
};
