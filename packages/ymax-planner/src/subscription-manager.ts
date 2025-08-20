import { watchCCTPTransfer } from './watch-cctp.ts';
import { JsonRpcProvider } from 'ethers';
import { getTxStatus } from './axelar/gmp-status.ts';
import { resolveSubscription } from './resolver.ts';
import type { VstorageKit, SmartWalletKit } from '@agoric/client-utils';
import type { SigningStargateClient } from '@cosmjs/stargate';
import type { AxelarChain } from '@agoric/portfolio-api/src/constants.js';
import type { AxelarId } from '@aglocal/portfolio-contract/src/portfolio.contract.ts';

export type PlannerContext = {
  axelarQueryApi: string;
  evmProviders: Partial<Record<EVMChain, JsonRpcProvider>>;
  stargateClient: SigningStargateClient;
  plannerAddress: string;
  vstorageKit: VstorageKit;
  walletKit: SmartWalletKit;
  fetch: typeof fetch;
};

type CCTPTransfer = {
  amount: number;
  chain: AxelarChain;
  receiver: string;
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

export const handleSubscription = async (
  ctx: PlannerContext,
  subscription: Subscription,
) => {
  const logPrefix = `[${subscription.subscriptionId}]`;
  console.log(`${logPrefix} handling ${subscription.type} subscription`);
  switch (subscription.type) {
    case 'cctp': {
      const { type, chain, receiver, amount, subscriptionId } = subscription;
      const provider = ctx.evmProviders[chain];
      if (!provider) {
        throw Error(
          `${logPrefix} No EVM provider configured for chain: ${chain}`,
        );
      }
      console.warn(`${logPrefix} handling cctp subscription`);
      const status = await watchCCTPTransfer({
        watchAddress: receiver,
        expectedAmount: BigInt(amount),
        provider,
        logPrefix,
      });

      if (status) {
        // TODO: Resolve the actual subscription id based on implementation in https://github.com/Agoric/agoric-sdk/issues/11709
        await resolveSubscription({
          walletKit: ctx.walletKit,
          vstorageKit: ctx.vstorageKit,
          stargateClient: ctx.stargateClient,
          address: ctx.plannerAddress,
          offerArgs: {
            vPath: subscriptionId,
            vData: {
              status: 'success',
              chain,
              receiver,
              amount,
              type,
            },
          },
        });
      } else {
        console.warn(`${logPrefix} CCTP transfer timed out`);
      }
      break;
    }

    case 'gmp': {
      const { type, destinationChain, contractAddress, subscriptionId } =
        subscription;
      console.warn(`${logPrefix} handling gmp subscription`);
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
      if (!res.success) {
        throw Error(`${logPrefix} deployment of funds not successful`);
      }
      // TODO: Resolve the actual subscription id based on implementation in https://github.com/Agoric/agoric-sdk/issues/11709
      await resolveSubscription({
        walletKit: ctx.walletKit,
        vstorageKit: ctx.vstorageKit,
        stargateClient: ctx.stargateClient,
        address: ctx.plannerAddress,
        offerArgs: {
          vPath: subscriptionId,
          vData: {
            status: 'success',
            destinationChain,
            contractAddress,
            type,
          },
        },
      });
      break;
    }
    default: {
      throw Error(`${logPrefix} invalid subscription type`);
    }
  }
};
