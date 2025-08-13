import { encodeFunctionData, encodeAbiParameters, hexToBytes } from 'viem';
import type { AbiEncodedContractCall, ContractCall } from './types';

export const channels = {
  mainnet: 'channel-9',
  devnet: 'channel-315',
};

export const urls = {
  mainnet: 'https://main.rpc.agoric.net:443',
  devnet: 'https://devnet.rpc.agoric.net/',
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
