import {
  axelarConfig as axelarConfigMainnet,
  axelarConfigTestnet,
} from '@aglocal/portfolio-deploy/src/axelar-configs.js';
import type { SigningStargateClient } from '@cosmjs/stargate';
import type { SmartWalletKit, VstorageKit } from '@agoric/client-utils';
import type { PlannerContext } from '../subscription-manager';

export const axelarQueryAPI = {
  mainnet: 'https://api.axelarscan.io/gmp/searchGMP',
  testnet: 'https://testnet.api.axelarscan.io/gmp/searchGMP',
};

export const evmRpcUrls = {
  mainnet: {
    Ethereum: 'https://ethereum-rpc.publicnode.com',
    // Source: https://build.avax.network/docs/tooling/rpc-providers#http
    Avalanche: 'https://api.avax.network/ext/bc/C/rpc',
    // Source: https://docs.arbitrum.io/build-decentralized-apps/reference/node-providers
    Arbitrum: 'https://arb1.arbitrum.io/rpc',
    // Source: https://docs.optimism.io/superchain/networks
    Optimism: 'https://mainnet.optimism.io',
    // Source: https://docs.polygon.technology/pos/reference/rpc-endpoints/#amoy
    Polygon: 'https://polygon-rpc.com/',
  },
  testnet: {
    Ethereum: 'https://ethereum-sepolia-rpc.publicnode.com',
    Avalanche: 'https://api.avax-test.network/ext/bc/C/rpc',
    Arbitrum: 'https://arbitrum-sepolia-rpc.publicnode.com',
    Optimism: 'https://optimism-sepolia-rpc.publicnode.com',
    Polygon: 'https://polygon-amoy-bor-rpc.publicnode.com',
  },
};

type CreateContextParams = {
  net?: 'mainnet' | 'testnet';
  stargateClient: SigningStargateClient;
  plannerAddress: string;
  vstorageKit: VstorageKit;
  walletKit: SmartWalletKit;
};

export const createContext = async ({
  net = 'testnet',
  stargateClient,
  plannerAddress,
  vstorageKit,
  walletKit,
}: CreateContextParams): Promise<PlannerContext> => {
  const configs = {
    mainnet: {
      axelarConfig: {
        ...axelarConfigMainnet,
        queryApi: axelarQueryAPI.mainnet,
      },
    },
    testnet: {
      axelarConfig: {
        ...axelarConfigTestnet,
        queryApi: axelarQueryAPI.testnet,
      },
    },
  };

  const config = configs[net];
  const axelarConfig = config.axelarConfig;

  return {
    axelarQueryApi: axelarConfig.queryApi,
    evmRpcUrls: evmRpcUrls[net],
    stargateClient,
    plannerAddress,
    vstorageKit,
    walletKit,
  };
};
