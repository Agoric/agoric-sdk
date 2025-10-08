import { Fail, q } from '@endo/errors';
import type { GasEstimator } from '@aglocal/portfolio-contract/tools/plan-solve.ts';
import {
  EvmWalletOperationType,
  YieldProtocol,
} from '@agoric/portfolio-api/src/constants.js';
import type { AxelarChain } from '@agoric/portfolio-api/src/constants';
import {
  walletOperationGasLimitEstimates,
  walletOperationFallbackGasLimit,
} from './support.ts';

const AGORIC_CHAIN = 'agoric';
const BLD_TOKEN = 'ubld';

export const makeGasEstimator = ({
  axelarApiAddress,
  axelarChainIdMap,
  fetch: fetchUrl,
}: {
  axelarApiAddress: string;
  axelarChainIdMap: Record<AxelarChain, string>;
  fetch: typeof fetch;
}): GasEstimator => {
  URL.canParse(axelarApiAddress) ||
    Fail`Invalid Axelar API address: ${axelarApiAddress}`;
  // Allow trailing slashes in `axelarApiAddress`.
  const axelarEstimateGasAddress = `${axelarApiAddress.replace(/\/*$/, '')}/gmp/estimateGasFee`;

  /** @see {@link https://docs.axelarscan.io/gmp#estimateGasFee} */
  const queryAxelarGasAPI = async (
    sourceChainName: AxelarChain | 'agoric',
    destinationChainName: AxelarChain | 'agoric',
    gasLimit: bigint,
    gasToken?: string,
  ) => {
    const sourceChain = axelarChainIdMap[sourceChainName] || 'agoric';
    const destinationChain = axelarChainIdMap[destinationChainName] || 'agoric';
    const response = await fetchUrl(axelarEstimateGasAddress, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sourceChain,
        destinationChain,
        gasLimit: `${gasLimit}`,
        sourceTokenSymbol: gasToken,
        gasMultiplier: '1',
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => {});
      Fail`HTTP ${q(response.status)} error! ${response} ${body}`;
    }

    const body = await response.text();
    return BigInt(body.trim());
  };

  const getWalletEstimate = async (
    chainName: AxelarChain,
    operationType?: EvmWalletOperationType,
    protocol?: YieldProtocol,
  ) => {
    const estimates = operationType
      ? walletOperationGasLimitEstimates[operationType]
      : {};
    // Absent a protocol-specific gas estimate, pick the first value for this
    // operation type (e.g., DepositForBurn might have the same value for all
    // protocols) or the generic fallback.
    const gasLimit =
      (protocol && estimates[protocol]) ??
      Object.values(estimates)[0] ??
      walletOperationFallbackGasLimit;
    return queryAxelarGasAPI(AGORIC_CHAIN, chainName, gasLimit, BLD_TOKEN);
  };

  const getFactoryContractEstimate = async (chainName: AxelarChain) =>
    queryAxelarGasAPI(
      AGORIC_CHAIN,
      chainName,
      walletOperationGasLimitEstimates[EvmWalletOperationType.Create][
        YieldProtocol.Aave
      ]!,
      BLD_TOKEN,
    );

  const getReturnFeeEstimate = async (chainName: AxelarChain) =>
    queryAxelarGasAPI(chainName, AGORIC_CHAIN, 1n);

  return {
    getWalletEstimate,
    getFactoryContractEstimate,
    getReturnFeeEstimate,
  };
};
