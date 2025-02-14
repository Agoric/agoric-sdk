import { ChainAddressShape } from '../typeGuards';
import { M } from '@endo/patterns';

/**
 * @typedef {{
*   nominator: bigint;
*   denominator: bigint;
* }} RatioShape
*/
/** @type {import('@agoric/internal').TypedPattern<RatioShape>} */
export const RatioShape = {
  nominator: M.bigint(),
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

