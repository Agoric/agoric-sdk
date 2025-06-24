import { type Amount, type Brand, type NatValue } from '@agoric/ertp';
import type { TypedPattern } from '@agoric/internal';
import type { CaipChainId, OrchestrationAccount } from '@agoric/orchestration';
import { type ContractCall } from '@agoric/orchestration/src/axelar-types.js';
import type { AmountKeywordRecord } from '@agoric/zoe';
import { AmountKeywordRecordShape } from '@agoric/zoe/src/typeGuards.js';
import { M } from '@endo/patterns';
import { AxelarChains, YieldProtocol } from './constants.js';

const { fromEntries, keys } = Object;

/**
 * @param brand must be a 'nat' brand, not checked
 */
export const makeNatAmountShape = (brand: Brand<'nat'>, min?: NatValue) =>
  harden({ brand, value: min ? M.gte(min) : M.nat() });

export type AaveGive = {
  AaveGmp: Amount<'nat'>;
  AaveAccount: Amount<'nat'>;
  Aave: Amount<'nat'>;
};
export type CompoundGive = {
  CompoundGmp: Amount<'nat'>;
  CompoundAccount: Amount<'nat'>;
  Compound: Amount<'nat'>;
};
export type GmpGive = {} | AaveGive | CompoundGive | (AaveGive & CompoundGive);
export type OpenPortfolioGive = { USDN?: Amount<'nat'> } & ({} | GmpGive);

export type ProposalType = {
  openPortfolio: { give: OpenPortfolioGive };
  rebalance:
    | { give: OpenPortfolioGive }
    | { want: Partial<Record<YieldProtocol, Amount<'nat'>>> };
};

export type AxelarChain = keyof typeof AxelarChains;
export type AxelarChainsMap = {
  [chain in AxelarChain]: {
    caip: CaipChainId;
    /**
     * Axelar chain IDs differ between mainnet and testnet.
     * See [supported-chains-list.ts](https://github.com/axelarnetwork/axelarjs-sdk/blob/f84c8a21ad9685091002e24cac7001ed1cdac774/src/chains/supported-chains-list.ts)
     */
    axelarId: string;
  };
};

const YieldProtocolShape = M.or(...keys(YieldProtocol));
export const makeProposalShapes = (usdcBrand: Brand<'nat'>) => {
  // TODO: Update usdcAmountShape, to include BLD/aUSDC after discussion with Axelar team
  const usdcAmountShape = makeNatAmountShape(usdcBrand);
  const AaveGiveShape = harden({
    Aave: usdcAmountShape,
    AaveGmp: usdcAmountShape,
    AaveAccount: usdcAmountShape,
  });
  const CompoundGiveShape = harden({
    Compound: usdcAmountShape,
    CompoundGmp: usdcAmountShape,
    CompoundAccount: usdcAmountShape,
  });
  const openGive = M.splitRecord(
    {},
    { USDN: usdcAmountShape },
    M.or(
      harden({}),
      AaveGiveShape,
      CompoundGiveShape,
      // TODO: and no others
      M.and(M.splitRecord(AaveGiveShape), M.splitRecord(CompoundGiveShape)),
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
 * This configuration allows each protocol to specify how the total
 * available gas should be divided between:
 *
 * - `gmpRatio`: General Message Passing (GMP) transactions.
 *    These are cross-chain messages (e.g., sending messages to an EVM chain).
 *
 * - `acctRatio`: Remote account creation transactions.
 *   These are used to create or initialize user accounts on the remote chain.
 *
 * Each ratio should be a decimal between 0 and 1, representing the percentage
 * of gas to use for the outbound message. The remaining percentage is to be reserved
 * for the incoming response from the remote EVM chain.
 *
 * Example:
 * - `gmpRatio: 0.6` means:
 *    → 60% of the gas will be used for the outbound GMP transaction.
 *    → 40% of the gas is reserved for the inbound response.
 *
 * - `acctRatio: 0.3` means:
 *    → 30% of the gas is allocated to outbound account creation.
 *    → 70% is reserved for handling the response or follow-up.
 * */
type ProtocolGasSplitConfig = {
  gmpRatio?: number;
  acctRatio?: number;
};

type OfferArgs1 = {
  destinationEVMChain?: AxelarChain;
  Aave?: ProtocolGasSplitConfig;
  Compound?: ProtocolGasSplitConfig;
  usdnOut?: NatValue;
};

const offerArgsShape: TypedPattern<OfferArgs1> = M.splitRecord(
  {},
  {
    destinationEVMChain: M.or(...keys(AxelarChains)),
    Aave: M.opt(
      M.splitRecord(
        {},
        {
          gmpRatio: M.and(M.gte(0), M.lte(1)),
          acctRatio: M.and(M.gte(0), M.lte(1)),
        },
      ),
    ),
    Compound: M.opt(
      M.splitRecord(
        {},
        {
          gmpRatio: M.and(M.gte(0), M.lte(1)),
          acctRatio: M.and(M.gte(0), M.lte(1)),
        },
      ),
    ),
    usdnOut: M.nat(),
  },
);

export type OfferArgsFor = {
  openPortfolio: OfferArgs1;
  rebalance: OfferArgs1;
};

export const OfferArgsShapeFor = {
  openPortfolio: offerArgsShape,
  rebalance: offerArgsShape,
};
harden(OfferArgsShapeFor);

export type EVMContractAddresses = {
  aavePool: `0x${string}`;
  compound: `0x${string}`;
  factory: `0x${string}`;
  usdc: `0x${string}`;
};

export const EVMContractAddressesShape: TypedPattern<EVMContractAddresses> =
  M.splitRecord({
    aavePool: M.string(),
    compound: M.string(),
    factory: M.string(),
    usdc: M.string(),
  });

const AxelarChainInfoPattern = M.splitRecord({
  caip: M.string(),
  axelarId: M.string(),
});

export const AxelarChainsMapShape: TypedPattern<AxelarChainsMap> =
  M.splitRecord(
    fromEntries(
      keys(AxelarChains).map(chain => [chain, AxelarChainInfoPattern]),
    ) as Record<AxelarChain, typeof AxelarChainInfoPattern>,
  );

export type BaseGmpArgs = {
  destinationEVMChain: AxelarChain;
  keyword: string;
  amounts: AmountKeywordRecord;
  /**
   * `gasRatio` should be a decimal between 0 and 1, representing the percentage of gas to use for the outbound message.
   * The remaining percentage is reserved for the incoming response from the remote EVM chain.
   */
  gasRatio: number;
};

export const GmpCallType = {
  ContractCall: 1,
  ContractCallWithToken: 2,
} as const;

export type GmpCallType = (typeof GmpCallType)[keyof typeof GmpCallType];

export type GmpArgsContractCall = BaseGmpArgs & {
  destinationAddress: string;
  type: GmpCallType;
  contractInvocationData: Array<ContractCall>;
};

export type GmpArgsTransferAmount = BaseGmpArgs & {
  transferAmount: bigint;
};

export type GmpArgsWithdrawAmount = BaseGmpArgs & {
  withdrawAmount: bigint;
};

export const ContractCallShape = M.splitRecord({
  target: M.string(),
  functionSignature: M.string(),
  args: M.arrayOf(M.any()),
});

export const GMPArgsShape: TypedPattern<GmpArgsContractCall> = M.splitRecord({
  destinationAddress: M.string(),
  type: M.or(1, 2),
  destinationEVMChain: M.or(...keys(AxelarChains)),
  keyword: M.string(),
  amounts: AmountKeywordRecordShape, // XXX brand should be exactly USDC
  contractInvocationData: M.arrayOf(ContractCallShape),
  gasRatio: M.and(M.gte(0), M.lte(1)),
});

export type LocalAccount = OrchestrationAccount<{ chainId: 'agoric-any' }>;
export type NobleAccount = OrchestrationAccount<{ chainId: 'noble-any' }>; // TODO: move to type-guards as external interface?

/** vstorage path for portfolio, under published.ymax0 */
export const makePortfolioPath = (id: number) => [`portfolio${id}`];
export const makePositionPath = (parent: number, id: number) => [
  `portfolio${parent}`,
  'positions',
  `position${id}`,
];
export const makeFlowPath = (parent: number, id: number) => [
  `portfolio${parent}`,
  'flows',
  `flow${id}`,
];
