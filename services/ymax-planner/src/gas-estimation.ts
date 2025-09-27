import { Fail, q } from '@endo/errors';
import type { AxelarChain } from '@agoric/portfolio-api/src/constants';
import { gasLimitEstimates } from './support.ts';

const AGORIC_CHAIN = 'agoric';
const BLD_TOKEN = 'ubld';

export type GasEstimator = ReturnType<typeof makeGasEstimator>;

export const makeGasEstimator = ({
  axelarApiAddress,
  fetchFunc,
  axelarChainIdMap,
}: {
  axelarApiAddress: string;
  fetchFunc: typeof fetch;
  axelarChainIdMap: Record<AxelarChain, string>;
}) => {
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
    const response = await fetchFunc(axelarEstimateGasAddress, {
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

  const getWalletEstimate = async (chainName: AxelarChain) =>
    queryAxelarGasAPI(
      AGORIC_CHAIN,
      chainName,
      gasLimitEstimates.Wallet,
      BLD_TOKEN,
    );

  const getFactoryContractEstimate = async (chainName: AxelarChain) =>
    queryAxelarGasAPI(
      AGORIC_CHAIN,
      chainName,
      gasLimitEstimates.Factory,
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
