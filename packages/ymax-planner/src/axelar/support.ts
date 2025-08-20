import type { SigningStargateClient } from '@cosmjs/stargate';
import type { SmartWalletKit, VstorageKit } from '@agoric/client-utils';
import { JsonRpcProvider } from 'ethers';
import type { PlannerContext, EVMChain } from '../subscription-manager';

export const axelarQueryAPI = {
  mainnet: 'https://api.axelarscan.io/gmp/searchGMP',
  testnet: 'https://testnet.api.axelarscan.io/gmp/searchGMP',
};

const { ALCHEMY_KEY } = process.env;
if (!ALCHEMY_KEY) throw Error(`ALCHEMY_KEY not set`);

export const evmRpcUrls = {
  mainnet: {
    Ethereum: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
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
    Ethereum: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`,
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
  fetch?: typeof fetch;
};

export const createContext = async ({
  net = 'testnet',
  stargateClient,
  plannerAddress,
  vstorageKit,
  walletKit,
  fetch = globalThis.fetch,
}: CreateContextParams): Promise<PlannerContext> => {
  const axelarQueryApi = axelarQueryAPI[net];

  const rpcUrls = evmRpcUrls[net];
  const evmProviders: Partial<Record<EVMChain, JsonRpcProvider>> = {};

  for (const [chain, rpcUrl] of Object.entries(rpcUrls)) {
    evmProviders[chain as EVMChain] = new JsonRpcProvider(rpcUrl);
  }

  return {
    axelarQueryApi,
    evmProviders,
    stargateClient,
    plannerAddress,
    vstorageKit,
    walletKit,
    fetch,
  };
};
