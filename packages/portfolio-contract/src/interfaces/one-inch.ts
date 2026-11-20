/**
 * @file ABI subset and calldata construction for the 1inch AggregationRouterV6.
 * @see {@link oneInchRouterABI}
 * @see {@link getOneInchSwapArgs}
 */
import type { Abi, Hex } from 'viem';
import type { AbiContractArgs } from '../evm-facade.ts';
import type { SwapBoundStep } from '../reward-bindings.ts';

/**
 * The generic `swap` entry point:
 * `swap(address,(address,address,address,address,uint256,uint256,uint256),bytes)`.
 *
 * We deliberately model only this route. 1inch Pathfinder may also return
 * gas-optimized variants (`unoswap*`, `clipperSwap*`, …) that encode the
 * receiver differently or not at all; using compatibility mode (forcing the API
 * to emit `swap()`) keeps the calldata we reconstruct below stable and pins the
 * selector to `0x07ed2379`.
 *
 * @see {@link https://github.com/1inch/limit-order-protocol#deployments--audits-limit-orders-protocol-v4}
 */
export const oneInchRouterABI = [
  {
    type: 'function',
    name: 'swap',
    stateMutability: 'payable',
    inputs: [
      { name: 'executor', type: 'address' },
      {
        name: 'desc',
        type: 'tuple',
        components: [
          { name: 'srcToken', type: 'address' },
          { name: 'dstToken', type: 'address' },
          { name: 'srcReceiver', type: 'address' },
          { name: 'dstReceiver', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'minReturnAmount', type: 'uint256' },
          { name: 'flags', type: 'uint256' },
        ],
      },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [
      { name: 'returnAmount', type: 'uint256' },
      { name: 'spentAmount', type: 'uint256' },
    ],
  },
] as const satisfies Abi;
harden(oneInchRouterABI);

/**
 * Build the args for 1inch V6 `swap()` from a {@link SwapBoundStep}, derived
 * by the contract from attestor-signed swap instructions, plugging in the
 * fund-safety fields the contract controls.
 *
 * The contract never trusts an opaque calldata blob: compromised instructions
 * could otherwise craft a swap that sends the proceeds to an arbitrary
 * address. By building the call ourselves we make the fund-safety fields
 * correct by construction rather than checked after decode:
 * - `srcToken` is the reward token we are approving, and `amount` equals the
 *   approved `amountIn`,
 * - `dstToken` is the configured USDC, as checked when binding,
 * - `dstReceiver` is this portfolio's own remote account,
 * - `minReturnAmount` is the signed `minAmountOut`, which is also the
 *   movement `amount`, and
 * - `flags` is always 0, excluding partial fills that would only guarantee a
 *   proportional minimum.
 *
 * These guarantee the proceeds can only ever arrive in our own account as USDC,
 * pulling no more than we approved, and the router reverts unless at least
 * `minReturnAmount` of USDC reaches `dstReceiver`. `executor`, `srcReceiver`,
 * and `data` are route internals: opaque to us, and trusted only as far as
 * the attestor that signed them.
 *
 * The result is spread into `makeContract(router, oneInchRouterABI).swap(...)`,
 * which ABI-encodes it through the same path as every other GMP contract call.
 */
export const getOneInchSwapArgs = (
  swap: Pick<
    SwapBoundStep,
    | 'tokenIn'
    | 'tokenOut'
    | 'amountIn'
    | 'minAmountOut'
    | 'executor'
    | 'srcReceiver'
    | 'data'
  >,
  controlled: { receiver: Hex },
): AbiContractArgs<typeof oneInchRouterABI, 'swap'> => {
  const { tokenIn, tokenOut, amountIn, minAmountOut, executor, srcReceiver } =
    swap;
  const { receiver } = controlled;
  return [
    executor,
    {
      srcToken: tokenIn,
      dstToken: tokenOut,
      srcReceiver,
      dstReceiver: receiver,
      amount: amountIn,
      minReturnAmount: minAmountOut,
      flags: 0n,
    },
    swap.data,
  ];
};
harden(getOneInchSwapArgs);
