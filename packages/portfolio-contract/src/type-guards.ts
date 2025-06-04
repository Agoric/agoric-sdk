import type { Amount, Brand, NatValue } from '@agoric/ertp';
import type { TypedPattern } from '@agoric/internal';
import type { ChainInfo, Denom, DenomDetail } from '@agoric/orchestration';
import {
  ChainInfoShape,
  DenomDetailShape,
  DenomShape,
} from '@agoric/orchestration/src/typeGuards.js';
import type { CopyRecord } from '@endo/pass-style';
import { M } from '@endo/patterns';
import {
  YieldProtocol,
  type YieldProtocol as YieldProtocolT,
} from './constants.js';

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

export type PortfolioConfig = {
  chainInfo: Record<string, ChainInfo>;
  assetInfo: [Denom, DenomDetail & { brandKey?: string }][];
} & CopyRecord;

export const PortfolioConfigShape = M.splitRecord({
  chainInfo: M.recordOf(M.string(), ChainInfoShape),
  assetInfo: M.arrayOf([DenomShape, DenomDetailShape]),
}) as TypedPattern<PortfolioConfig>;
