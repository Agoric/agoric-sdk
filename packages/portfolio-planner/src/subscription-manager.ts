import type { AxelarChain } from '@aglocal/portfolio-contract/src/constants';
import { EVM_RPC, watchCCTPMint } from './watch-cctp';
import { JsonRpcProvider } from 'ethers';
import { getTxStatus } from './axelar/gmp-status';
import { resolveSubscription } from './resolver';
import type {
  AxelarId,
  GmpAddresses,
} from '@aglocal/portfolio-contract/src/portfolio.contract';
import type { EVMContractAddressesMap } from '@aglocal/portfolio-contract/src/type-guards';
import type { VstorageKit, SmartWalletKit } from '@agoric/client-utils';
import type { SigningStargateClient } from '@cosmjs/stargate';

export type PortfolioInstanceContext = {
  axelarConfig: {
    axelarIds: AxelarId;
    contracts: EVMContractAddressesMap;
    gmpAddresses: GmpAddresses;
    queryApi: string;
  };
  rpcUrl: string;
  stargateClient: SigningStargateClient;
  plannerAddress: string;
  vstorageKit: VstorageKit;
  walletKit: SmartWalletKit;
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

type CctpSubscription = BaseSubscription & {
  type: 'cctp';
  data: CCTPTransfer; // Required to check cctp tx status off-chain
};

type GmpSubscription = BaseSubscription & {
  type: 'gmp';
  data: GmpTransfer;
};

export type Subscription = CctpSubscription | GmpSubscription;

export const handleSubscription = async (
  ctx: PortfolioInstanceContext,
  subscription: Subscription,
) => {
  switch (subscription.type) {
    case 'cctp': {
      const { data, subscriptionId } = subscription;
      const rpc = EVM_RPC[data.chain];
      const provider = new JsonRpcProvider(rpc);
      const status = await watchCCTPMint({
        chain: data.chain,
        recipient: data.receiver,
        expectedAmount: BigInt(data.amount),
        provider,
      });

      if (status) {
        console.log(
          `✅ [CCTP] Transfer confirmed for portfolio ${subscriptionId}`,
        );
        console.log(`TODO: resolve ${subscriptionId}`);
      } else {
        console.warn(
          `[CCTP] Transfer timed out for portfolio ${subscriptionId}`,
        );
      }
      break;
    }

    case 'gmp': {
      const { data, subscriptionId } = subscription;
      const res = await getTxStatus({
        url: ctx.axelarConfig.queryApi,
        fetch,
        params: {
          sourceChain: 'agoric',
          destinationChain: data.destinationChain as unknown as string,
          contractAddress: data.contractAddress,
        },
      });
      if (!res.success) {
        throw Error('deployment of funds not successful');
      }
      // TODO: Resolve the actual subscription id based on implementation in https://github.com/Agoric/agoric-sdk/issues/11709
      await resolveSubscription({
        walletKit: ctx.walletKit,
        vstorageKit: ctx.vstorageKit,
        stargateClient: ctx.stargateClient,
        address: ctx.plannerAddress,
        offerArgs: {
          vPath: 'portfolio1',
          vData: {
            pendingCCTPTransfers: {
              status: 'completed',
            },
          },
        },
      });
    }
    default: {
      throw Error('invalid subscription type');
    }
  }
};
