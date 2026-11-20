/**
 * @file Policy shared by the portfolio contract and the observation service
 * (YDS) for swapping claimed rewards.
 *
 * This module has no runtime dependency on Endo, so that it can be used
 * outside of a locked-down (SES) environment.
 */

const BPS_DENOMINATOR = 10_000n;

/**
 * The maximum slippage tolerated by reward swap instructions, in basis
 * points (2%). YDS quotes with this slippage unless the requester asks for a
 * stricter one, and the contract rejects swap instructions whose
 * `slippageBps` exceeds it, or whose `minAmountOut` is below what it implies.
 */
export const MAX_REWARD_SWAP_SLIPPAGE_BPS = 200;

/**
 * The least minimum output acceptable for a swap quoted to output
 * `quotedAmountOut` with a tolerance of `slippageBps`, rounding up so that
 * the tolerance is never exceeded:
 * `ceil(quotedAmountOut * (10000 - slippageBps) / 10000)`.
 *
 * Both amounts are in raw units of the swap's output token.
 *
 * @param quotedAmountOut
 * @param slippageBps an integer from 0 to 10000
 */
export const getMinAmountOutForSlippage = (
  quotedAmountOut: bigint,
  slippageBps: number,
): bigint => {
  if (typeof quotedAmountOut !== 'bigint' || quotedAmountOut < 0n) {
    throw RangeError(`invalid quotedAmountOut: ${String(quotedAmountOut)}`);
  }
  if (
    !Number.isSafeInteger(slippageBps) ||
    slippageBps < 0 ||
    slippageBps > Number(BPS_DENOMINATOR)
  ) {
    throw RangeError(`invalid slippageBps: ${String(slippageBps)}`);
  }
  const numerator = quotedAmountOut * (BPS_DENOMINATOR - BigInt(slippageBps));
  return (numerator + BPS_DENOMINATOR - 1n) / BPS_DENOMINATOR;
};
Object.freeze(getMinAmountOutForSlippage);
