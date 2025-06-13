import type { TypedPattern } from '@agoric/internal';
import { M } from '@endo/patterns';
import type { SupportedDestinationChains } from '@agoric/orchestration/src/axelar-types.js';
import type { YieldProtocol as YieldProtocolT } from './constants.js';
import { YieldProtocol } from './constants.js';
import { supportedDestinationChains } from './portfolio.exo.js';

const { keys } = Object;

/**
 * @param brand must be a 'nat' brand, not checked
 */
export const makeNatAmountShape = (brand: Brand<'nat'>, min?: NatValue) =>
  harden({ brand, value: min ? M.gte(min) : M.nat() });

export type ProposalShapes = {
  openPortfolio: { give: Partial<Record<YieldProtocolT, Amount<'nat'>>> };
};

export type OfferArgsShapes = {
  evmChain?: SupportedDestinationChains;
};

export const makeProposalShapes = (usdcBrand: Brand<'nat'>) => {
  const usdcAmountShape = makeNatAmountShape(usdcBrand);
  return {
    openPortfolio: M.splitRecord({
      give: M.recordOf(M.or(...keys(YieldProtocol)), usdcAmountShape),
    }) as TypedPattern<ProposalShapes['openPortfolio']>,
  };
};

export const makeOfferArgsShapes = () => {
  return M.splitRecord({
    evmChain: M.opt(M.or(...supportedDestinationChains)),
  }) as TypedPattern<OfferArgsShapes>;
};
