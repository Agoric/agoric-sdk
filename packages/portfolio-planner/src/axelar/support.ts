import { encodeFunctionData, encodeAbiParameters, hexToBytes } from 'viem';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { stringToPath } from '@cosmjs/crypto';
import {
  axelarConfig as axelarConfigMainnet,
  axelarConfigTestnet,
  gmpAddresses,
} from './axelar-configs.js';
import type {
  ContractCall,
  AbiEncodedContractCall,
  PortfolioInstanceContext,
} from './gmp.js';

export const channels = {
  mainnet: 'channel-9',
  testnet: 'channel-315',
};

export const urls = {
  mainnet: 'https://main.rpc.agoric.net:443',
  testnet: 'https://devnet.rpc.agoric.net/',
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
  mnemonic: string,
  net: 'mainnet' | 'testnet' = 'testnet',
): Promise<PortfolioInstanceContext> => {
  const Agoric = {
    Bech32MainPrefix: 'agoric',
    CoinType: 564,
  };
  const hdPath = (coinType = 118, account = 0) =>
    stringToPath(`m/44'/${coinType}'/${account}'/0/0`);

  // TODO: pass a signer to the createContext function call
  const signer = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    prefix: Agoric.Bech32MainPrefix,
    hdPaths: [hdPath(Agoric.CoinType, 0), hdPath(Agoric.CoinType, 1)],
  });

  const configs = {
    mainnet: {
      axelarConfig: { ...axelarConfigMainnet },
      gmpAddresses: {
        ...gmpAddresses.mainnet,
      },
    },
    testnet: {
      axelarConfig: { ...axelarConfigTestnet },
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
    },
    signer,
    sourceChannel: channels[net],
    rpcUrl: urls[net],
  };
};
