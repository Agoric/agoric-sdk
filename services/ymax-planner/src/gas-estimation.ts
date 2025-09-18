import {
  axelarConfig,
  axelarConfigTestnet,
} from '@aglocal/portfolio-deploy/src/axelar-configs.js';
import { buildGMPPayload } from '@agoric/orchestration/src/utils/gmp.js';
import type { AxelarChain } from '@agoric/portfolio-api/src/constants';
import { ethers } from 'ethers';
import { getEvmRpcMap } from './support.ts';

// arbitrary value. it just mimicks a valid command id for axelar
const COMMAND_ID =
  '0xddea323337dfb73c82df7393d76b2f38835d5c2bda0123c47d1a2fc06527d19f';
const AGORIC_CHAIN = 'agoric';
const BLD_TOKEN = 'ubld';
const GAS_ESTIMATOR_CONTRACT_ABI = [
  'function executeFactory(bytes32 commandId, string sourceChain, string sourceAddress, bytes payload)',
  'function executeWallet(bytes32 commandId, string sourceChain, string sourceAddress, bytes payload)',
];
const GAS_ESTIMATOR_OWNER = 'agoric1owner';

const bytesToHex = (bytes: number[]): string =>
  '0x' + bytes.map(n => n.toString(16).padStart(2, '0')).join('');

const gasEstimatorContracts = {
  mainnet: {},
  testnet: {
    Avalanche: '0x0010F196F5CD0314f68FF665b8c8eD93531112Fe',
  },
};

export const makeGasEstimatorKit = ({
  alchemyApiKey,
  clusterName,
  chainName,
}: {
  alchemyApiKey: string;
  clusterName: 'mainnet' | 'testnet';
  chainName: AxelarChain;
}) => {
  const axelarConf =
    clusterName === 'mainnet' ? axelarConfig : axelarConfigTestnet;
  const chainConfig = axelarConf[chainName];

  const evmContracts = chainConfig.contracts;
  const gasEstimatorContract = gasEstimatorContracts[clusterName][chainName];

  const axelarApiAddress =
    clusterName === 'mainnet'
      ? 'https://api.axelarscan.io/gmp/estimateGasFee'
      : 'https://testnet.api.axelarscan.io/gmp/estimateGasFee';

  const evmRpcMap = getEvmRpcMap(clusterName, alchemyApiKey);
  const evmRpcAddress =
    evmRpcMap[
      `${chainConfig.chainInfo.namespace}:${chainConfig.chainInfo.reference}`
    ];

  const generateAaveSupplyPayload = (
    chainName: AxelarChain,
    contractAddress: string,
    payment: string,
  ) => {
    const contractCalls = [
      {
        target: evmContracts.usdc,
        functionSignature: 'approve(address,uint256)',
        args: [evmContracts.aavePool, payment],
      },
      {
        target: evmContracts.aavePool,
        functionSignature: 'supply(address,uint256,address,uint16)',
        args: [evmContracts.usdc, payment, contractAddress, '0'],
      },
    ];
    return bytesToHex(buildGMPPayload(contractCalls));
  };

  const queryAxelarGasAPI = async (
    sourceChain: AxelarChain | 'agoric',
    destinationChain: AxelarChain | 'agoric',
    gasLimit: bigint,
    gasToken?: string,
  ) => {
    const response = await fetch(axelarApiAddress, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sourceChain,
        destinationChain,
        gasLimit: gasLimit.toString(),
        sourceTokenSymbol: gasToken,
        gasMultiplier: '1',
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  };

  const queryEstimateGas = async (
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
    return async (
      functionName: string,
      params: any[] = [],
      fromAddress?: string,
    ): Promise<bigint> => {
      const provider = new ethers.JsonRpcProvider(rpcUrl);

      return queryEstimateGas(
        provider,
        contractAddress,
        GAS_ESTIMATOR_CONTRACT_ABI,
        functionName,
        params,
        fromAddress,
      );
    };
  };

  const getWalletEstimate = async () => {
    const ethGasEstimator = createGasEstimator(
      evmRpcAddress,
      gasEstimatorContract,
    );

    const payload = generateAaveSupplyPayload(
      chainName,
      gasEstimatorContract,
      '1', // Arbitrary minimum value needed to execute successfully
    );

    const gasLimit = await ethGasEstimator('executeWallet', [
      COMMAND_ID,
      AGORIC_CHAIN,
      GAS_ESTIMATOR_OWNER,
      payload,
    ]);

    const estimate = (await queryAxelarGasAPI(
      AGORIC_CHAIN,
      chainName,
      gasLimit,
      BLD_TOKEN,
    )) as string;

    return BigInt(estimate);
  };

  const getFactoryContractEstimate = async () => {
    const ethGasEstimator = createGasEstimator(
      evmRpcAddress,
      gasEstimatorContract,
    );

    // Payload should be 0 since no eth will be present on the gas estimator contract
    const payload = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [0]);

    const gasLimit = await ethGasEstimator('executeFactory', [
      COMMAND_ID,
      AGORIC_CHAIN,
      GAS_ESTIMATOR_OWNER,
      payload,
    ]);

    const estimate = (await queryAxelarGasAPI(
      AGORIC_CHAIN,
      chainName,
      gasLimit,
      BLD_TOKEN,
    )) as string;

    return BigInt(estimate);
  };

  const getReturnFeeEstimate = async () => {
    const fee = (await queryAxelarGasAPI(chainName, 'agoric', 1n)) as string;

    return BigInt(fee);
  };

  return {
    getWalletEstimate,
    getFactoryContractEstimate,
    getReturnFeeEstimate,
  };
};
