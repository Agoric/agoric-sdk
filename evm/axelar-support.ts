import { AxelarQueryAPI, Environment } from '@axelar-network/axelarjs-sdk';
import { CHAIN } from './config';
import { encodeFunctionData, encodeAbiParameters, hexToBytes } from 'viem';
import type { AbiEncodedContractCall, ContractCall } from './types';

const convertToAtomicUnits = (amount, decimals) => {
  return Math.ceil(amount * Math.pow(10, decimals));
};

export const getGasEstimate = async ({
  destinationChain,
  gasLimit,
  gasMuliplier,
}) => {
  const multiplier = gasMuliplier || 'auto';
  const api = new AxelarQueryAPI({ environment: Environment.TESTNET });
  const gasAmount = await api.estimateGasFee(
    CHAIN.osmosis,
    destinationChain,
    gasLimit,
    multiplier,
    'aUSDC'
  );
  const gasAmountUSDC = parseInt(String(gasAmount)) / 1e6;
  console.log(`Estimated gas fee aUSDC: ${gasAmountUSDC}`);

  const usdcAtomic = convertToAtomicUnits(gasAmountUSDC, 6);
  console.log(`Estimated gas fee aUSDC: ${usdcAtomic} ATOMIC value`);

  return usdcAtomic;
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
      constructContractCall({ target, functionSignature, args })
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
    [abiEncodedContractCalls]
  );

  return Array.from(hexToBytes(abiEncodedData));
};
