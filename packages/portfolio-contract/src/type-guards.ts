import type { Amount, Brand, NatValue } from '@agoric/ertp';
import type { TypedPattern } from '@agoric/internal';
import type { SupportedEVMChains } from '@agoric/orchestration/src/axelar-types.js';
import { M } from '@endo/patterns';
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

export const makeProposalShapes = (usdcBrand: Brand<'nat'>) => {
  const usdcAmountShape = makeNatAmountShape(usdcBrand);
  return {
    openPortfolio: M.splitRecord({
      give: M.recordOf(M.or(...keys(YieldProtocol)), usdcAmountShape),
    }) as TypedPattern<ProposalShapes['openPortfolio']>,
  };
};

export type EVMOfferArgs = {
  evmChain?: SupportedEVMChains;
};

export const EVMOfferArgsShape: TypedPattern<EVMOfferArgs> = M.splitRecord(
  {},
  {
    // Use Axelar chain identifier instead of CAP-10 ID for cross-chain messaging
    // Axelar docs: https://docs.axelar.dev/dev/reference/mainnet-chain-names
    // Chain names: https://axelarscan.io/resources/chains
    evmChain: ChainShape,
  },
);

export type EVMContractAddresses = {
  aavePool: string;
  compound: string;
  factory: string;
};

export const EVMContractAddressesShape: TypedPattern<EVMContractAddresses> =
  M.splitRecord({
    aavePool: M.string(),
    compound: M.string(),
    factory: M.string(),
  });
