import { M } from '@endo/patterns';

/**
 * @param {Brand} brand must be a 'nat' brand, not checked
 * @param {NatValue} [min]
 */
export const makeNatAmountShape = (brand, min) =>
  harden({ brand, value: min ? M.gte(min) : M.nat() });

/** @param {Record<'PoolShares' | 'USDC', Brand<'nat'>>} brands */
export const makeProposalShapes = ({ PoolShares, USDC }) =>
  harden({
    deposit: M.splitRecord(
      { give: { ToPool: makeNatAmountShape(USDC, 1n) } },
      { want: { Shares: makeNatAmountShape(PoolShares) } },
    ),
    withdraw: M.splitRecord({
      give: { Shares: makeNatAmountShape(PoolShares, 1n) },
      want: { FromPool: makeNatAmountShape(USDC, 1n) },
    }),
  });
