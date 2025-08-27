import type { AxelarId } from '@aglocal/portfolio-contract/src/portfolio.contract.ts';
import type { SigningSmartWalletKit } from '@agoric/client-utils';
import type { AxelarChain } from '@agoric/portfolio-api/src/constants.js';
import { JsonRpcProvider } from 'ethers';
import { getTxStatus } from './axelar/gmp-status.ts';
import { resolveCCTPSubscription, resolveGMPSubscription } from './resolver.ts';
import { watchCCTPTransfer } from './watch-cctp.ts';
import type { TxStatus } from '@aglocal/portfolio-contract/src/resolver/constants.js';

export type EVMContext = {
  axelarQueryApi: string;
  evmProviders: Partial<Record<EVMChain, JsonRpcProvider>>;
  signingSmartWalletKit: SigningSmartWalletKit;
  fetch: typeof fetch;
};

type CCTPTransfer = {
  amount: bigint;
  destinationAddress: string;
};

export type GmpTransfer = {
  lcaAddr: string;
  destinationChain: AxelarId;
  contractAddress: string;
};

/**
 * Subscription state machine:
 * pending -> success (when cross-chain operation completes successfully)
 * pending -> timeout (when operation fails or times out)
 *
 * Terminal states: success and timeout never transition to other states.
 */
type BaseSubscription = {
  subscriptionId: string;
  status: TxStatus;
};

type SubscriptionOf<T, K extends string> = BaseSubscription & T & { type: K };

export type CctpSubscription = SubscriptionOf<CCTPTransfer, 'cctp'>;
export type GmpSubscription = SubscriptionOf<GmpTransfer, 'gmp'>;

export type Subscription = CctpSubscription | GmpSubscription;

export type EVMChain = keyof typeof AxelarChain;

/* Sourced from:
 * - https://chainlist.org/
 * - https://docs.simplehash.com/reference/supported-chains-testnets
 *   (accessed on 26th August 2025)
 */
const chainIdToEVMChain: Record<string, EVMChain> = {
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

export const handleSubscription = async (
  ctx: EVMContext,
  subscription: Subscription,
  log: (...args: unknown[]) => void = () => {},
) => {
  await null;
  const logPrefix = `[${subscription.subscriptionId}]`;
  log(`${logPrefix} handling ${subscription.type} subscription`);
  switch (subscription.type) {
    case 'cctp': {
      const { destinationAddress, amount, subscriptionId } = subscription;
      // Parse destinationAddress format: 'eip155:42161:0x126cf3AC9ea12794Ff50f56727C7C66E26D9C092'
      const [, chainId, receiver] = destinationAddress.split(':');
      const chain = chainIdToEVMChain[chainId];
      const provider = ctx.evmProviders[chain];
      if (!provider) {
        throw Error(
          `${logPrefix} No EVM provider configured for chain: ${chain}`,
        );
      }
      log(`${logPrefix} handling cctp subscription`);
      const transferStatus = await watchCCTPTransfer({
        watchAddress: receiver,
        expectedAmount: amount,
        provider,
        log: (msg, ...args) => log(`${logPrefix} ${msg}`, ...args),
      });

      await resolveCCTPSubscription({
        signingSmartWalletKit: ctx.signingSmartWalletKit,
        subscriptionId,
        status: transferStatus ? 'success' : 'timeout',
        subscriptionData: subscription,
      });
      break;
    }

    case 'gmp': {
      const { destinationChain, contractAddress, subscriptionId } =
        subscription;
      log(`${logPrefix} handling gmp subscription`);
      const res = await getTxStatus({
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
      // TODO: resolve subscription
      break;
    }
    default: {
      throw Error(`${logPrefix} invalid subscription type`);
    }
  }
};
