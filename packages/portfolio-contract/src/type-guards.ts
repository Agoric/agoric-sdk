import type { Amount, Brand, NatValue } from '@agoric/ertp';
import type { TypedPattern } from '@agoric/internal';
import { M } from '@endo/patterns';
import type { SupportedEVMChains } from '@agoric/orchestration/src/axelar-types.js';
import type { YieldProtocol as YieldProtocolT } from './constants.js';
import { YieldProtocol } from './constants.js';
import { ChainShape } from './portfolio.exo.js';

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
  evmChain?: SupportedEVMChains;
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
    // Use Axelar chain identifier instead of CAP-10 ID for cross-chain messaging
    // Axelar docs: https://docs.axelar.dev/dev/reference/mainnet-chain-names
    // Chain names: https://axelarscan.io/resources/chains
    evmChain: M.opt(ChainShape),
  }) as TypedPattern<OfferArgsShapes>;
};
