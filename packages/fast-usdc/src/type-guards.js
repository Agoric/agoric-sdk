import { M } from '@endo/patterns';
import { BrandShape } from '@agoric/ertp';

/**
 * @import {TypedPattern} from '@agoric/internal'
 * @import {USDCProposalShapes} from './pool-share-math'
 * @import {FastUsdcTerms} from './fast-usdc.contract'
 */

/**
 * @param {Brand} brand must be a 'nat' brand, not checked
 * @param {NatValue} [min]
 */
export const makeNatAmountShape = (brand, min) =>
  harden({ brand, value: min ? M.gte(min) : M.nat() });

/** @param {Record<'PoolShares' | 'USDC', Brand<'nat'>>} brands */
export const makeProposalShapes = ({ PoolShares, USDC }) => {
  /** @type {TypedPattern<USDCProposalShapes['deposit']>} */
  const deposit = M.splitRecord(
    { give: { USDC: makeNatAmountShape(USDC, 1n) } },
    { want: { PoolShare: makeNatAmountShape(PoolShares) } },
  );
  /** @type {TypedPattern<USDCProposalShapes['withdraw']>} */
  const withdraw = M.splitRecord({
    give: { PoolShare: makeNatAmountShape(PoolShares, 1n) },
    want: { USDC: makeNatAmountShape(USDC, 1n) },
  });
  return harden({ deposit, withdraw });
};

const NatAmountShape = { brand: BrandShape, value: M.nat() };
/** @type {TypedPattern<FastUsdcTerms>} */
export const FastUSDCTermsShape = harden({
  contractFee: NatAmountShape,
  poolFee: NatAmountShape,
  usdcDenom: M.string(),
});
