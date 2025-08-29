import { JsonRpcProvider } from 'ethers';
import type { EvmContext } from './subscription-manager';
import type { CaipChainId } from '@agoric/orchestration';

export const axelarQueryAPI = {
  mainnet: 'https://api.axelarscan.io/gmp/searchGMP',
  testnet: 'https://testnet.api.axelarscan.io/gmp/searchGMP',
};

const { ALCHEMY_API_KEY } = process.env;
if (!ALCHEMY_API_KEY) throw Error(`ALCHEMY_API_KEY not set`);

const axelarChainIdMap = {
  mainnet: {
    'eip155:1': 'ethereum-sepolia',
    'eip155:43114': 'Avalanche',
    'eip155:42161': 'arbitrum',
    'eip155:10': 'optimism',
    'eip155:137': 'Polygon',
  },
  testnet: {
    'eip155:11155111': 'Ethereum',
    'eip155:43113': 'Avalanche',
    'eip155:421614': 'arbitrum-sepolia',
    'eip155:11155420': 'optimism-sepolia',
    'eip155:80002': 'polygon-sepolia',
  },
};

export type AxelarChainIdMap = typeof axelarChainIdMap;

type HexAddress = `0x${string}`;

export type UsdcAddresses = {
  mainnet: Record<CaipChainId, HexAddress>;
  testnet: Record<CaipChainId, HexAddress>;
};

/**
 * Sourced from:
 * - https://chainlist.org/
 * - https://docs.simplehash.com/reference/supported-chains-testnets
 *   (accessed on 27th August 2025)
 * - https://developers.circle.com/cctp/evm-smart-contracts
 * - https://developers.circle.com/stablecoins/usdc-contract-addresses
 *
 * Notes:
 * - This list should conceptually come from an orchestration type
 *   for supported EVM networks.
 * - Currently this config mirrors the EVM chains defined in
 *   packages/orchestration/src/cctp-chain-info.js
 */
export const usdcAddresses: UsdcAddresses = {
  mainnet: {
    'eip155:8453': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base
    'eip155:43114': '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', // Avalanche
    'eip155:42161': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum
    'eip155:1': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum
    'eip155:10': '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // Optimism
    'eip155:137': '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359', // Polygon
  },
  testnet: {
    'eip155:84532': '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia
    'eip155:43113': '0x5425890298aed601595a70AB815c96711a31Bc65', // Avalanche Fuji
    'eip155:421614': '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', // Arbitrum Sepolia
    'eip155:11155111': '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Ethereum Sepolia
    'eip155:11155420': '0x5fd84259d66Cd46123540766Be93DFE6D43130D7', // Optimism Sepolia
    'eip155:80002': '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582', // Polygon Amoy
  },
};

export type EvmRpc = {
  mainnet: Record<CaipChainId, string>;
  testnet: Record<CaipChainId, string>;
};

export const evmRpcUrls: EvmRpc = {
  mainnet: {
    'eip155:1': `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    // Source: https://build.avax.network/docs/tooling/rpc-providers#http
    'eip155:43114': 'https://api.avax.network/ext/bc/C/rpc',
    // Source: https://docs.arbitrum.io/build-decentralized-apps/reference/node-providers
    'eip155:42161': 'https://arb1.arbitrum.io/rpc',
    // Source: https://docs.optimism.io/superchain/networks
    'eip155:10': 'https://mainnet.optimism.io',
    // Source: https://docs.polygon.technology/pos/reference/rpc-endpoints/#amoy
    'eip155:137': 'https://polygon-rpc.com/',
  },
  testnet: {
    'eip155:11155111': `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    'eip155:43113': 'https://api.avax-test.network/ext/bc/C/rpc',
    'eip155:421614': 'https://arbitrum-sepolia-rpc.publicnode.com',
    'eip155:11155420': 'https://optimism-sepolia-rpc.publicnode.com',
    'eip155:80002': 'https://polygon-amoy-bor-rpc.publicnode.com',
  },
};

type CreateContextParams = {
  net?: 'mainnet' | 'testnet';
};

export type EvmProviders = Partial<Record<CaipChainId, JsonRpcProvider>>;

export const createEVMContext = async ({
  net = 'testnet',
}: CreateContextParams): Promise<
  Pick<
    EvmContext,
    'axelarQueryApi' | 'evmProviders' | 'usdcAddresses' | 'axelarChainIds'
  >
> => {
  const axelarQueryApi = axelarQueryAPI[net];

  const urls = evmRpcUrls[net];
  const evmProviders = Object.fromEntries(
    Object.entries(urls).map(([caip, rpcUrl]) => [
      caip,
      new JsonRpcProvider(rpcUrl),
    ]),
  ) as EvmProviders;

  return {
    axelarQueryApi,
    evmProviders,
    usdcAddresses: usdcAddresses[net],
    axelarChainIds: axelarChainIdMap[net],
  };
};
