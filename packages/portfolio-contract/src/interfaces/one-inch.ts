/**
 * @file ABI subset and calldata construction for the 1inch AggregationRouterV6.
 * @see {@link oneInchRouterABI}
 * @see {@link getOneInchSwapArgs}
 */
import type { OneInchSwapDesc } from '@agoric/portfolio-api';
import type { Abi, Hex } from 'viem';

import type { AbiContractArgs } from '../evm-facade.ts';

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
 * Build the args for 1inch V6 `swap()` from the planner-supplied
 * {@link OneInchSwapDesc}, plugging in the fund-safety fields the contract controls.
 *
 * The contract never trusts an opaque calldata blob: a compromised planner or
 * 1inch API could otherwise craft a swap that sends the proceeds to an
 * arbitrary address or token. By building the call ourselves we make the
 * fund-safety fields correct by construction rather than checked after decode:
 * - `srcToken` is the reward token we are approving,
 * - `dstToken` is USDC,
 * - `dstReceiver` is this portfolio's own remote account,
 * - `amount` equals the approved `amountIn`, and
 * - `minReturnAmount` is the contract-controlled USDC floor, taken from the
 *   movement `amount`
 *
 * These guarantee the proceeds can only ever arrive in our own account as USDC,
 * pulling no more than we approved, and the router reverts unless at least
 * `minReturnAmount` of USDC reaches `dstReceiver`. `executor`, `srcReceiver`,
 * and `data` are route internals: opaque to us, trusted only because the
 * planner produced them.
 *
 * The result is spread into `makeContract(router, oneInchRouterABI).swap(...)`,
 * which ABI-encodes it through the same path as every other GMP contract call.
 */
export const getOneInchSwapArgs = (
  swap: OneInchSwapDesc,
  controlled: { usdc: Hex; receiver: Hex; minReturnAmount: bigint },
): AbiContractArgs<typeof oneInchRouterABI, 'swap'> => {
  const { tokenIn, amountIn, flags, executor, srcReceiver, data } = swap;
  const { usdc, receiver, minReturnAmount } = controlled;
  return [
    executor,
    {
      srcToken: tokenIn,
      dstToken: usdc,
      srcReceiver,
      dstReceiver: receiver,
      amount: amountIn,
      minReturnAmount,
      flags,
    },
    data,
  ];
};
harden(getOneInchSwapArgs);
