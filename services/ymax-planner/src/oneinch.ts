import type { KyInstance } from 'ky';
import { decodeFunctionData, type DecodeFunctionDataReturnType } from 'viem';

import { Fail } from '@endo/errors';

import { oneInchRouterABI } from '@aglocal/portfolio-contract/src/interfaces/one-inch.js';
import type { EvmAddress } from '@agoric/fast-usdc';

type OneInchRouterSwapArgs = DecodeFunctionDataReturnType<
  typeof oneInchRouterABI,
  'swap'
>['args'];

export const ONEINCH_API_BASE_URL = 'https://api.1inch.dev';

/**
 * @see https://business.1inch.com/portal/documentation/apis/swap/classic-swap/methods/v6.1/1/swap/method/get
 */
export type OneInchSwapAPI = {
  RequestParameters: {
    /** EIP155 chain ID. */
    chainId: number;
    /** The token being swapped from. */
    src: EvmAddress;
    /** The token being swapped into. */
    dst: EvmAddress;
    /** Sell amount, in `src` base units. */
    amount: `${bigint}`;
    /** The address that calls the 1inch contract. */
    from: EvmAddress;
    /** An EOA address that initiates the transaction. */
    origin: EvmAddress;
    /** The address that will receive funds after the swap. Defaults to `from`. */
    receiver?: EvmAddress;
    /** Slippage tolerance in percent. Exclusive with `minReturn`. */
    slippage?: number;
    /**
     * Minimum amount of destination token that must be received, in the smallest
     * unit (considering decimals). Exclusive with `slippage`.
     */
    minReturn?: `${bigint}`;
    allowPartialFill?: boolean;
    /** Request estimated gas in the response. */
    includeGas?: boolean;
  };
  Response: {
    /** Output amount, in RequestParameters `dst` base units. */
    dstAmount: `${bigint}`;
    tx: {
      from: EvmAddress;
      to: EvmAddress;
      data: `0x${string}`;
      /** Estimated units of gas. */
      gas?: number;
    };
  };
};

/**
 * Generate calldata to swap on 1inch Router.
 * @see https://business.1inch.com/portal/documentation/apis/swap/classic-swap/methods/v6.1/1/swap/method/get
 */
export const fetchOneInchSwapInfo = async (
  client: KyInstance,
  params: OneInchSwapAPI['RequestParameters'],
): Promise<{
  executor: OneInchRouterSwapArgs[0];
  desc: OneInchRouterSwapArgs[1];
  data: OneInchRouterSwapArgs[2];
  gas?: bigint;
}> => {
  const resp = await client
    .get(`swap/v6.1/${params.chainId}`, { searchParams: params })
    .json<OneInchSwapAPI['Response']>();
  const { data: txData, gas } = resp.tx;
  const { functionName, args } = decodeFunctionData({
    abi: oneInchRouterABI,
    data: txData,
  });
  functionName === 'swap' ||
    Fail`1inch swap returned unexpected function call ${functionName}`;
  const [executor, desc, data] = args;
  return { executor, desc, data, gas: gas ? BigInt(gas) : undefined };
};
