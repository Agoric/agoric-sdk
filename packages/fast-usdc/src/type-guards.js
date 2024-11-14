import { M } from '@endo/patterns';

/**
 * @import {TypedPattern} from '@agoric/internal'
 * @import {USDCProposalShapes} from './pool-share-math'
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
