import { Fail, q } from '@endo/errors';
import type { CaipChainId } from '@agoric/orchestration';
import type { GasEstimator } from '@aglocal/portfolio-contract/tools/plan-solve.ts';
import {
  EvmWalletOperationType,
  SupportedChain,
  YieldProtocol,
} from '@agoric/portfolio-api/src/constants.js';
import type { AxelarChain } from '@agoric/portfolio-api/src/constants.js';
import {
  walletOperationGasLimitEstimates,
  walletOperationFallbackGasLimit,
} from './support.ts';

const AGORIC_CHAIN = 'agoric';
const BLD_TOKEN = 'ubld';

export const GAS_STATE_WINDOW_DURATIONS = Object.freeze([
  'PT15M',
  'PT24H',
  'P30D',
] as const);
export const GAS_STATE_WINDOW_METRICS = Object.freeze([
  'min',
  'mean',
  'p50',
  'p90',
  'max',
] as const);
export type GasStateWindowDuration =
  (typeof GAS_STATE_WINDOW_DURATIONS)[number];
export type GasStateWindowMetric = (typeof GAS_STATE_WINDOW_METRICS)[number];

/** cf. https://github.com/Agoric/ymax-web/blob/main/yds/src/api-schemas.ts: ChainGasState */
export type ChainGasState = {
  caip2Id: CaipChainId;
  chainName: SupportedChain;
  gasDenom: string;
  /** Each gasDenom is 10^gasDenomScale scaledGasDenoms, e.g. 1 ETH = 10^9 Gwei. */
  gasDenomScale: number;
  current: {
    sampleBaseFee: number;
    samplePriorityFee: number;
    /** scaledGasDenom per gas-unit */
    sample: number;
    /** micro-USD per gas-unit */
    sampleUusd: number | null;
    usdPerGasDenom: number | null;
    blockNumber: number | null;
    blockTimestampSec: number | null;
    takenAtSec: number;
  };
  /**
   * Statistics about gas cost in {scaledGasDenom,micro-USD} per gas-unit over
   * multiple windows (latest and immediately-preceding 15m windows, plus 24h
   * and 30d).
   */
  windows: {
    /** ISO 8601 duration. */
    duration: (typeof GAS_STATE_WINDOW_DURATIONS)[number] | string;
    untilSec: number;
    min: number;
    mean: number;
    p50: number;
    p90: number;
    max: number;
    minUusd: number;
    meanUusd: number;
    p50Uusd: number;
    p90Uusd: number;
    maxUusd: number;
    sampleCount: number;
  }[];
};

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
    gasLimit?: bigint,
  ) => {
    if (gasLimit === undefined) {
      const estimates = operationType
        ? walletOperationGasLimitEstimates[operationType]
        : {};
      // Absent a protocol-specific gas estimate, pick the first value for this
      // operation type (e.g., DepositForBurn might have the same value for all
      // protocols) or the generic fallback.
      gasLimit =
        (protocol && estimates[protocol]) ??
        Object.values(estimates)[0] ??
        walletOperationFallbackGasLimit;
    }
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
