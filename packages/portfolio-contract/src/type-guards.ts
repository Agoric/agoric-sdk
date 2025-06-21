import type { Amount, Brand, NatValue } from '@agoric/ertp';
import type { TypedPattern } from '@agoric/internal';
import type { OrchestrationAccount } from '@agoric/orchestration';
import type {
  ContractCall,
  SupportedEVMChains,
} from '@agoric/orchestration/src/axelar-types.js';
import { M } from '@endo/patterns';
import { YieldProtocol } from './constants.js';

const { keys } = Object;

/**
 * @param brand must be a 'nat' brand, not checked
 */
export const makeNatAmountShape = (brand: Brand<'nat'>, min?: NatValue) =>
  harden({ brand, value: min ? M.gte(min) : M.nat() });

type OpenPortfolioGive = { USDN?: Amount<'nat'> } & (
  | {
      GMPFee: Amount<'nat'>;
      Aave?: Amount<'nat'>;
      Compound?: Amount<'nat'>;
    }
  | {}
);

export type ProposalType = {
  openPortfolio: { give: OpenPortfolioGive };
  rebalance:
    | { give: OpenPortfolioGive }
    | { want: Partial<Record<YieldProtocol, Amount<'nat'>>> };
};

const YieldProtocolShape = M.or(...keys(YieldProtocol));

export const makeProposalShapes = (usdcBrand: Brand<'nat'>) => {
  const usdcAmountShape = makeNatAmountShape(usdcBrand);
  const openGive = M.splitRecord(
    {},
    { USDN: usdcAmountShape },
    M.or(
      M.splitRecord(
        { GMPFee: usdcAmountShape },
        {
          Aave: usdcAmountShape,
          Compound: usdcAmountShape,
        },
        {},
      ),
      M.splitRecord({}, {}, {}),
    ),
  );
  return {
    openPortfolio: M.splitRecord(
      { give: openGive },
      { want: {}, exit: M.any() },
      {},
    ) as TypedPattern<ProposalType['openPortfolio']>,
    rebalance: M.or(
      M.splitRecord({ give: openGive }, { want: {}, exit: M.any() }, {}),
      M.splitRecord(
        { want: M.recordOf(YieldProtocolShape, usdcAmountShape) },
        { give: {}, exit: M.any() },
        {},
      ),
    ) as TypedPattern<ProposalType['rebalance']>,
  };
};

/**
 * Use Axelar chain identifier instead of CAP-10 ID for cross-chain messaging
 * @see {@link https://docs.axelar.dev/dev/reference/mainnet-chain-names|Axelar docs}
 * @see {@link https://axelarscan.io/resources/chains|Chain names}
 */
export type OfferArgsFor = {
  openPortfolio: { evmChain?: SupportedEVMChains };
  rebalance: { evmChain?: SupportedEVMChains };
};

export const ChainShape = M.string(); // TODO: narrow?

// Use Axelar chain identifier instead of CAP-10 ID for cross-chain messaging
// Axelar docs: https://docs.axelar.dev/dev/reference/mainnet-chain-names
// Chain names: https://axelarscan.io/resources/chains
const optEvmChainShape = M.splitRecord({}, { evmChain: ChainShape });

export const OfferArgsShapeFor = {
  openPortfolio: optEvmChainShape as TypedPattern<
    OfferArgsFor['openPortfolio']
  >,
  rebalance: optEvmChainShape as TypedPattern<OfferArgsFor['rebalance']>,
};
harden(OfferArgsShapeFor);

export type GMPArgs = {
  destinationAddress: string;
  destinationEVMChain: SupportedEVMChains;
} & (
  | { type: 3 }
  | {
      type: 1 | 2;
      gasAmount: number;
      contractInvocationData: Array<ContractCall>;
    }
);

export const ContractCallShape = harden({
  target: M.string(),
  functionSignature: M.string(),
  args: M.array(),
});

export const GMPArgsShape: TypedPattern<GMPArgs> = M.and(
  M.splitRecord({ destinationAddress: M.string() }),
  M.or(
    M.splitRecord({ type: 1 }),
    M.splitRecord({
      type: M.or(1, 2),
      gasAmount: M.number(),
      contractInvocationData: M.arrayOf(ContractCallShape),
    }),
  ),
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

export type LocalAccount = OrchestrationAccount<{ chainId: 'agoric-any' }>;
