import type { TypedPattern } from '@agoric/internal';
import { M } from '@endo/patterns';
import {
  AxelarChains,
  type YieldProtocol as YieldProtocolT,
} from './constants.js';
import { YieldProtocol } from './constants.js';

const { keys } = Object;

/**
 * @param brand must be a 'nat' brand, not checked
 */
export const makeNatAmountShape = (brand: Brand<'nat'>, min?: NatValue) =>
  harden({ brand, value: min ? M.gte(min) : M.nat() });

export const AxelarGas = {
  Account: 'Account',
  Gmp: 'Gmp',
} as const;
export type ProposalShapes = {
  openPortfolio: {
    give: Partial<
      Record<YieldProtocolT | keyof typeof AxelarGas, Amount<'nat'>>
    >;
  };
};

export type AxelarChain = keyof typeof AxelarChains;
export type AxelarChainsMap = {
  [chain in AxelarChain]: {
    caip: `${string}:${string}`;
    axelarId: string;
  };
};

export type OfferArgsShapes = {
  evmChain: AxelarChain;
};

export const makeProposalShapes = (usdcBrand: Brand<'nat'>) => {
  // TODO: Update usdcAmountShape, to include BLD/aUSDC after discussion with Axelar team
  const usdcAmountShape = makeNatAmountShape(usdcBrand);
  return {
    openPortfolio: M.splitRecord({
      give: M.recordOf(
        M.or(...keys({ ...YieldProtocol, ...AxelarGas })),
        usdcAmountShape,
      ),
    }) as TypedPattern<ProposalShapes['openPortfolio']>,
  };
};

export const makeOfferArgsShapes = () => {
  return M.splitRecord({
    // Use Axelar chain identifier instead of CAP-10 ID for cross-chain messaging
    // Axelar docs: https://docs.axelar.dev/dev/reference/mainnet-chain-names
    // Chain names: https://axelarscan.io/resources/chains
    evmChain: M.or(...keys(AxelarChains)),
  }) as TypedPattern<OfferArgsShapes>;
};
