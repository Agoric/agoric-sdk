import type { AxelarChain } from '@aglocal/portfolio-contract/src/constants';
import { EVM_RPC, watchCCTPMint } from './watch-cctp';
import {
  handleGmp,
  type GmpArgsForCommand,
  type GmpArgsMap,
} from './axelar/handle-gmp';
import type { PortfolioInstanceContext } from './axelar/gmp';
import { JsonRpcProvider } from 'ethers';

type CCTPTransfer = {
  amount: number;
  chain: AxelarChain;
  receiver: string;
};

export type GmpTransfer<C extends keyof GmpArgsMap = keyof GmpArgsMap> = {
  command: C;
  args: GmpArgsForCommand<C>;
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
      await handleGmp(ctx, data.command, data.args);
      console.log(`TODO: resolve ${subscriptionId}`);
      break;
    }
    default: {
      throw Error('invalid subscription type');
    }
  }
};
