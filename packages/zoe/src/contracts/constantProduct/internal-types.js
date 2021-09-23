// @ts-check

/**
 * @typedef {Object} ImprovedNoFeeSwapResult
 * @property {Amount} amountIn
 * @property {Amount} amountOut
 * @property {Amount} improvement
 */

/**
 * @typedef {Object} FeePair
 *
 * @property {Amount} poolFee
 * @property {Amount} protocolFee
 */

/**
 * @typedef {Object} PoolAllocation
 *
 * @property {Amount} Central
 * @property {Amount} Secondary
 */

/**
 * @typedef {Object} NoFeeSwapFnInput
 * @property {Amount} amountGiven
 * @property {Amount} amountWanted
 * @property {Brand=} brand
 * @property {PoolAllocation} poolAllocation
 */

/**
 * @typedef {Object} SwapResult
 *
 * @property {Amount} xIncrement
 * @property {Amount} swapperGives
 * @property {Amount} yDecrement
 * @property {Amount} swapperGets
 * @property {Amount} improvement
 * @property {Amount} protocolFee
 * @property {Amount} poolFee
 * @property {Amount} newY
 * @property {Amount} newX
 */

/**
 * @callback NoFeeSwapFn
 * @param {NoFeeSwapFnInput} input
 * @returns {ImprovedNoFeeSwapResult}
 */

/**
 * @callback InternalSwap
 * @param {Amount} amountGiven
 * @param {PoolAllocation} poolAllocation
 * @param {Amount} amountWanted
 * @param {Ratio} protocolFeeRatio
 * @param {Ratio} poolFeeRatio
 * @param {NoFeeSwapFn} swapFn
 * @returns {SwapResult}
 */
