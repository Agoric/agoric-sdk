/**
 * @file Type validation and proposal shapes for portfolio contract
 * 
 * Defines TypeScript types and runtime validation patterns for:
 * - Proposal shapes for portfolio operations
 * - Amount validation for different yield protocols
 * - Brand-specific type guards for USDC amounts
 */
import type { TypedPattern } from '@agoric/internal';
import { M } from '@endo/patterns';
import type { YieldProtocol as YieldProtocolT } from './constants.js';
import { YieldProtocol } from './constants.js';

const { keys } = Object;

/**
 * @param brand must be a 'nat' brand, not checked
 */
export const makeNatAmountShape = (brand: Brand<'nat'>, min?: NatValue) =>
  harden({ brand, value: min ? M.gte(min) : M.nat() });

export type ProposalShapes = {
  openPortfolio: { give: Partial<Record<YieldProtocolT, Amount<'nat'>>> };
};

export const makeProposalShapes = (usdcBrand: Brand<'nat'>) => {
  const usdcAmountShape = makeNatAmountShape(usdcBrand);
  return {
    openPortfolio: M.splitRecord({
      give: M.recordOf(M.or(...keys(YieldProtocol)), usdcAmountShape),
    }) as TypedPattern<ProposalShapes['openPortfolio']>,
  };
};
