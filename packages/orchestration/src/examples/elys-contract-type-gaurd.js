import { M } from '@endo/patterns';

/**
 * @typedef {{
 *   numerator: bigint;
 *   denominator: bigint;
 * }} RatioShape
 */
/** @type {import('@agoric/internal').TypedPattern<RatioShape>} */
export const RatioShape = {
  numerator: M.bigint(),
  denominator: M.bigint(),
};
harden(RatioShape);

/**
 * @typedef {{
 *   feeCollector: string;
 *   onBoardRate: RatioShape;
 *   offBoardRate: RatioShape;
 * }} FeeConfigShape
 */
/** @type {import('@agoric/internal').TypedPattern<FeeConfigShape>} */
export const FeeConfigShape = {
  feeCollector: M.string(),
  onBoardRate: RatioShape,
  offBoardRate: RatioShape,
};
harden(FeeConfigShape);

export function validateFeeConfigShape(feeConfigShape) {
  const { onBoardRate, offBoardRate } = feeConfigShape;
  const isValidRatio = ({ numerator, denominator }) => {
    if (denominator === 0n) {
      return false;
    }
    return numerator >= 0n && numerator <= denominator;
  };

  return isValidRatio(onBoardRate) && isValidRatio(offBoardRate);
}