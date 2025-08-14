import { encodeFunctionData, encodeAbiParameters, hexToBytes } from 'viem';
import {
  axelarConfig as axelarConfigMainnet,
  axelarConfigTestnet,
  gmpAddresses,
} from '@aglocal/portfolio-deploy/src/axelar-configs.js';
import type {
  ContractCall,
  AbiEncodedContractCall,
  PortfolioInstanceContext,
} from './gmp.ts';
import type { SigningStargateClient } from '@cosmjs/stargate';

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

export const constructContractCall = ({
  target,
  functionSignature,
  args,
}: ContractCall): AbiEncodedContractCall => {
  const [name, paramsRaw] = functionSignature.split('(');
  const params = paramsRaw.replace(')', '').split(',').filter(Boolean);

  return {
    target,
    data: encodeFunctionData({
      abi: [
        {
          type: 'function',
          name,
          inputs: params.map((type, i) => ({ type, name: `arg${i}` })),
        },
      ],
      functionName: name,
      args,
    }),
  };
};

/**
 * Builds a GMP payload from an array of contract calls.
 */
export const buildGMPPayload = (contractCalls: ContractCall[]): number[] => {
  const abiEncodedContractCalls: AbiEncodedContractCall[] = [];
  for (const call of contractCalls) {
    const { target, functionSignature, args } = call;
    abiEncodedContractCalls.push(
      constructContractCall({ target, functionSignature, args }),
    );
  }

  const abiEncodedData = encodeAbiParameters(
    [
      {
        type: 'tuple[]',
        components: [
          { name: 'target', type: 'address' },
          { name: 'data', type: 'bytes' },
        ],
      },
    ],
    [abiEncodedContractCalls],
  );

  return Array.from(hexToBytes(abiEncodedData));
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

export const createContext = async (
  net: 'mainnet' | 'testnet' = 'testnet',
  stargateClient: SigningStargateClient,
  plannerAddress: string,
): Promise<PortfolioInstanceContext> => {
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
    sourceChannel: channels[net],
    rpcUrl: urls[net],
    stargateClient,
    plannerAddress,
  };
};
