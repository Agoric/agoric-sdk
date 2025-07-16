import { fromHex } from '@cosmjs/encoding';
import {
  encodeAbiParameters,
  encodeFunctionData,
} from '../vendor/viem/viem-abi.js';

/** @param {string} hex */
const hexToBytes = hex => fromHex(hex.slice(2));

/**
 * @import {ContractCall, AbiEncodedContractCall} from '../axelar-types.js';
 * @import {Bech32Address} from '@agoric/orchestration';
 */

export const GMPMessageType = {
  MESSAGE_ONLY: 1,
  MESSAGE_WITH_TOKEN: 2,
  TOKEN_ONLY: 3,
};

/**
 * @type {{
 *   AXELAR_GMP: Bech32Address;
 *   AXELAR_GAS: Bech32Address;
 *   OSMOSIS_RECEIVER: Bech32Address;
 * }}
 */
export const gmpAddresses = {
  AXELAR_GMP:
    'axelar1dv4u5k73pzqrxlzujxg3qp8kvc3pje7jtdvu72npnt5zhq05ejcsn5qme5',
  AXELAR_GAS: 'axelar1zl3rxpp70lmte2xr6c4lgske2fyuj3hupcsvcd',
  OSMOSIS_RECEIVER: 'osmo1yh3ra8eage5xtr9a3m5utg6mx0pmqreytudaqj',
};

/**
 * Constructs a contract call object with ABI encoding.
 *
 * @param {ContractCall} data - The data for the contract call.
 * @returns {AbiEncodedContractCall} The encoded contract call object.
 */
export const constructContractCall = ({ target, functionSignature, args }) => {
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
 *
 * @param {ContractCall[]} contractCalls - Array of contract call objects.
 * @returns {number[]} The GMP payload array.
 */
export const buildGMPPayload = contractCalls => {
  const abiEncodedContractCalls = [];
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

export const networkConfigs = {
  devnet: {
    label: 'Agoric Devnet',
    url: 'https://devnet.agoric.net/network-config',
    rpc: 'https://devnet.rpc.agoric.net',
    api: 'https://devnet.api.agoric.net',
    chainId: 'agoricdev-25',
  },
  emerynet: {
    label: 'Agoric Emerynet',
    url: 'https://emerynet.agoric.net/network-config',
    rpc: 'https://emerynet.rpc.agoric.net',
    api: 'https://emerynet.api.agoric.net',
    chainId: 'agoric-emerynet-9',
  },
  localhost: {
    label: 'Local Network',
    url: 'https://local.agoric.net/network-config',
    rpc: 'http://localhost:26657',
    api: 'http://localhost:1317',
    chainId: 'agoriclocal',
  },
};

export const EVM_CHAINS = {
  Avalanche: 'Avalanche',
  Base: 'base-sepolia',
  Ethereum: 'ethereum-sepolia',
};
