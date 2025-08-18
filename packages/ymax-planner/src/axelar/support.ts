import { encodeFunctionData, encodeAbiParameters, hexToBytes } from 'viem';
import {
  axelarConfig as axelarConfigMainnet,
  axelarConfigTestnet,
  gmpAddresses,
} from '@aglocal/portfolio-deploy/src/axelar-configs.js';
import type { SigningStargateClient } from '@cosmjs/stargate';
import type { SmartWalletKit, VstorageKit } from '@agoric/client-utils';
import type { PortfolioInstanceContext } from '../subscription-manager';

export const channels = {
  mainnet: 'channel-9',
  testnet: 'channel-315',
};

export const urls = {
  mainnet: 'https://main.rpc.agoric.net:443',
  testnet: 'https://devnet.rpc.agoric.net/',
};

export const axelarQueryAPI = {
  mainnet: 'https://api.axelarscan.io/gmp/searchGMP',
  testnet: 'https://testnet.api.axelarscan.io/gmp/searchGMP',
};

/**
 * @param {bigint} gasAmount - gas amount for the EVM to Agoric message
 * @returns {number[]} The payload array.
 */
export const buildGasPayload = gasAmount => {
  const abiEncodedData = encodeAbiParameters(
    [{ type: 'uint256' }],
    [gasAmount],
  );

  return Array.from(hexToBytes(abiEncodedData));
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
}: CreateContextParams): Promise<PortfolioInstanceContext> => {
  const configs = {
    mainnet: {
      axelarConfig: {
        ...axelarConfigMainnet,
        queryApi: axelarQueryAPI.mainnet,
      },
      gmpAddresses: {
        ...gmpAddresses.mainnet,
      },
    },
    testnet: {
      axelarConfig: {
        ...axelarConfigTestnet,
        queryApi: axelarQueryAPI.testnet,
      },
      gmpAddresses: {
        ...gmpAddresses.testnet,
      },
    },
  };

  const config = configs[net];
  const axelarConfig = config.axelarConfig;

  const axelarIds = {
    Avalanche: axelarConfig.Avalanche.axelarId,
    Arbitrum: axelarConfig.Arbitrum.axelarId,
    Optimism: axelarConfig.Optimism.axelarId,
    Polygon: axelarConfig.Polygon.axelarId,
  };

  const contracts = {
    Avalanche: { ...axelarConfig.Avalanche.contracts },
    Arbitrum: { ...axelarConfig.Arbitrum.contracts },
    Optimism: { ...axelarConfig.Optimism.contracts },
    Polygon: { ...axelarConfig.Polygon.contracts },
  };

  return {
    axelarConfig: {
      axelarIds,
      contracts,
      gmpAddresses: config.gmpAddresses,
      queryApi: axelarConfig.queryApi,
    },
    rpcUrl: urls[net],
    stargateClient,
    plannerAddress,
    vstorageKit,
    walletKit,
  };
};
