import { AxelarQueryAPI, Environment } from '@axelar-network/axelarjs-sdk';
import { ethers } from 'ethers';
import { fromHex } from '@cosmjs/encoding';
import { encodeAbiParameters } from 'viem';
import createKeccakHash from 'keccak';
import { encode } from '@metamask/abi-utils';

const GAS_ESTIMATOR_CONTRACT = '0x0010F196F5CD0314f68FF665b8c8eD93531112Fe';

const hexToBytes = (hex: string) => fromHex(hex.slice(2));

const uint8ArrayToHex = (uint8Array: Uint8Array): string => {
  return `0x${Array.from(uint8Array)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')}`;
};

const pack = (
  functionSignature: string,
  paramTypes: Array<string>,
  params: Array<string>,
): `0x${string}` => {
  const functionHash = createKeccakHash('keccak256')
    .update(functionSignature)
    .digest();
  return uint8ArrayToHex(
    Uint8Array.from([
      ...Uint8Array.from(functionHash.subarray(0, 4)),
      ...encode(paramTypes, params),
    ]),
  ) as `0x${string}`;
};

const generatePayload = (
  id: string,
  contractAddress: string,
  payment: string,
) => {
  const abiEncodedContractCalls = [
    {
      target: '0x5425890298aed601595a70AB815c96711a31Bc65' as `0x${string}`,
      data: pack(
        'approve(address,uint256)',
        ['address', 'uint256'],
        ['0x8B9b2AF4afB389b4a70A474dfD4AdCD4a302bb40', payment],
      ),
    },
    {
      target: '0x8B9b2AF4afB389b4a70A474dfD4AdCD4a302bb40' as `0x${string}`,
      data: pack(
        'supply(address,uint256,address,uint16)',
        ['address', 'uint256', 'address', 'uint16'],
        [
          '0x5425890298aed601595a70AB815c96711a31Bc65',
          payment,
          contractAddress,
          '0',
        ],
      ),
    },
  ];
  const payload = encodeAbiParameters(
    [
      {
        type: 'tuple',
        name: 'callMessage',
        components: [
          { name: 'id', type: 'string' },
          {
            name: 'calls',
            type: 'tuple[]',
            components: [
              { name: 'target', type: 'address' },
              { name: 'data', type: 'bytes' },
            ],
          },
        ],
      },
    ],
    [{ id, calls: abiEncodedContractCalls }],
  );
  return payload;
};

const queryAxelarGasAPI = async (
  sourceChain: string,
  destinationChain: string,
  gasLimit: bigint,
  gasToken?: string,
) => {
  const api = new AxelarQueryAPI({ environment: Environment.TESTNET });

  const GAS_MULTIPLIER = 1;

  const feeQuote = await api.estimateGasFee(
    sourceChain,
    destinationChain, // mayber lowercase?
    gasLimit,
    GAS_MULTIPLIER,
    gasToken,
  );
  return feeQuote;
};

export const getReturnFeeEstimate = async (chainName: string) => {
  const fee = (await queryAxelarGasAPI(chainName, 'agoric', 1n)) as string;

  return BigInt(fee);
};

const estimateContractGas = async (
  provider: ethers.Provider,
  contractAddress: string,
  abi: ethers.InterfaceAbi,
  functionName: string,
  params: any[] = [],
  fromAddress?: string,
): Promise<bigint> => {
  const contract = new ethers.Contract(contractAddress, abi, provider);

  const gasEstimate = await contract[functionName].estimateGas(
    ...params,
    fromAddress ? { from: fromAddress } : {},
  );

  return gasEstimate;
};

const createGasEstimator = (rpcUrl: string, contractAddress: string) => {
  const contractAbi = [
    'function executeFactory(bytes32 commandId, string sourceChain, string sourceAddress, bytes payload)',
    'function executeWallet(bytes32 commandId, string sourceChain, string sourceAddress, bytes payload)',
  ];

  return async (
    functionName: string,
    params: any[] = [],
    fromAddress?: string,
  ): Promise<bigint> => {
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    return estimateContractGas(
      provider,
      contractAddress,
      contractAbi,
      functionName,
      params,
      fromAddress,
    );
  };
};

const estimateContracts = {
  Avalanche: createGasEstimator(
    'https://api.avax-test.network/ext/bc/C/rpc',
    GAS_ESTIMATOR_CONTRACT,
  ),
};

export const getWalletEstimate = async (chainName: string) => {
  const estimateContract = estimateContracts[chainName];
  const txId = 'tx0';
  const payloadString = generatePayload(txId, GAS_ESTIMATOR_CONTRACT, '5');
  const payload = Array.from(hexToBytes(payloadString));
  const commandId =
    '0xddea323337dfb73c82df7393d76b2f38835d5c2bda0123c47d1a2fc06527d19f';

  const gasLimit = await estimateContract('executeFactory', [
    commandId,
    'agoric',
    'agoric1owner',
    payload,
  ]);

  const estimate = (await queryAxelarGasAPI(
    'agoric',
    chainName,
    gasLimit,
    'ubld',
  )) as string;
  return BigInt(estimate);
};
export const getFactoryContractEstimate = async (chainName: string) => {
  const estimateContract = estimateContracts[chainName];

  const payload = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [0]);
  const commandId =
    '0xddea323337dfb73c82df7393d76b2f38835d5c2bda0123c47d1a2fc06527d19f';

  const gasLimit = await estimateContract('executeFactory', [
    commandId,
    'agoric',
    'agoric1owner',
    payload,
  ]);

  const estimate = (await queryAxelarGasAPI(
    'agoric',
    chainName,
    gasLimit,
    'ubld',
  )) as string;
  return BigInt(estimate);
};
