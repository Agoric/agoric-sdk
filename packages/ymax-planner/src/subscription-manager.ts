import { makeTracer } from '@agoric/internal';
import { watchCCTPTransfer } from './watch-cctp.ts';
import { JsonRpcProvider } from 'ethers';
import { getTxStatus } from './axelar/gmp-status.ts';
import { resolveSubscription } from './resolver.ts';
import type { SigningSmartWalletKit } from '@agoric/client-utils';
import type { AxelarChain } from '@agoric/portfolio-api/src/constants.js';
import type { AxelarId } from '@aglocal/portfolio-contract/src/portfolio.contract.ts';

const trace = makeTracer('SM');

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

type BaseSubscription = {
  subscriptionId: string;
  status: 'pending' | 'success' | 'timeout';
};

type SubscriptionOf<T, K extends string> = BaseSubscription & T & { type: K };

type CctpSubscription = SubscriptionOf<CCTPTransfer, 'cctp'>;
type GmpSubscription = SubscriptionOf<GmpTransfer, 'gmp'>;

export type Subscription = CctpSubscription | GmpSubscription;

// Using only 'Ethereum' for now because CCTP transfers to it work reliably off-chain.
// Other testnet chains currently have issues, so we're excluding them for the time being.
export type EVMChain = keyof typeof AxelarChain | 'Ethereum';

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
  '80002': 'Polygon',
  '11155420': 'Optimism',
};

export const handleSubscription = async (
  ctx: EVMContext,
  subscription: Subscription,
) => {
  const logPrefix = `[${subscription.subscriptionId}]`;
  trace(`${logPrefix} handling ${subscription.type} subscription`);
  switch (subscription.type) {
    case 'cctp': {
      const { type, destinationAddress, amount, subscriptionId } = subscription;
      // Parse destinationAddress format: 'eip155:42161:0x126cf3AC9ea12794Ff50f56727C7C66E26D9C092'
      const [, chainId, receiver] = destinationAddress.split(':');
      const chain = chainIdToEVMChain[chainId];
      const provider = ctx.evmProviders[chain];
      if (!provider) {
        throw Error(
          `${logPrefix} No EVM provider configured for chain: ${chain}`,
        );
      }
      trace(`${logPrefix} handling cctp subscription`);
      const transferStatus = await watchCCTPTransfer({
        watchAddress: receiver,
        expectedAmount: amount,
        provider,
        logPrefix,
      });

      // TODO: Resolve the actual subscription id based on implementation in https://github.com/Agoric/agoric-sdk/issues/11709
      await resolveSubscription({
        signingSmartWalletKit: ctx.signingSmartWalletKit,
        subscriptionId,
        status: transferStatus ? 'success' : 'timeout',
        subscriptionData: { destinationAddress, amount, type },
      });
      break;
    }

    case 'gmp': {
      const { type, destinationChain, contractAddress, subscriptionId } =
        subscription;
      trace(`${logPrefix} handling gmp subscription`);
      const res = await getTxStatus({
        url: ctx.axelarQueryApi,
        fetch: ctx.fetch,
        params: {
          sourceChain: 'agoric',
          destinationChain: destinationChain as unknown as string,
          contractAddress: contractAddress,
        },
        subscriptionId,
        logPrefix,
      });

      // TODO: Resolve the actual subscription id based on implementation in https://github.com/Agoric/agoric-sdk/issues/11709
      await resolveSubscription({
        signingSmartWalletKit: ctx.signingSmartWalletKit,
        subscriptionId,
        status: res.success ? 'success' : 'timeout',
        subscriptionData: { destinationChain, contractAddress, type },
      });
      break;
    }
    default: {
      throw Error(`${logPrefix} invalid subscription type`);
    }
  }
};
