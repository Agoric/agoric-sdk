import type { Amount, Brand, NatValue } from '@agoric/ertp';
import type { TypedPattern } from '@agoric/internal';
import type {
  CaipChainId,
  Denom,
  OrchestrationAccount,
} from '@agoric/orchestration';
import { M } from '@endo/patterns';
import { type ContractCall } from '@agoric/orchestration/src/axelar-types.js';
import type { ZoeTools } from '@agoric/orchestration/src/utils/zoe-tools.js';
import { AmountKeywordRecordShape } from '@agoric/zoe/src/typeGuards.js';
import type { ResolvedPublicTopic } from '@agoric/zoe/src/contractSupport/topics.js';
import {
  AxelarChains,
  YieldProtocol,
  type YieldProtocol as YieldProtocolT,
} from './constants.js';
import type { PortfolioKit } from './portfolio.exo.js';
import type {
  GuestInterface,
  HostInterface,
} from '../../async-flow/src/types.js';

const { fromEntries, keys } = Object;

/**
 * @param brand must be a 'nat' brand, not checked
 */
export const makeNatAmountShape = (brand: Brand<'nat'>, min?: NatValue) =>
  harden({ brand, value: min ? M.gte(min) : M.nat() });

export const AxelarGas = {
  Account: 'Account',
  Gmp: 'Gmp',
} as const;

export type OpenPortfolioGive = Partial<
  Record<YieldProtocolT | keyof typeof AxelarGas, Amount<'nat'>>
>;

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
  const openGive = M.splitRecord(
    {},
    { USDN: usdcAmountShape },
    M.or(
      M.splitRecord(
        { Gmp: usdcAmountShape, Account: usdcAmountShape },
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

export type EVMOfferArgs = {
  destinationEVMChain: AxelarChain;
};

export const EVMOfferArgsShape: TypedPattern<EVMOfferArgs> = M.splitRecord(
  {},
  {
    destinationEVMChain: M.or(...keys(AxelarChains)),
  },
) as TypedPattern<EVMOfferArgs>;

export type OfferArgsFor = {
  openPortfolio: EVMOfferArgs;
  rebalance: EVMOfferArgs;
};

export const OfferArgsShapeFor = {
  openPortfolio: EVMOfferArgsShape as TypedPattern<
    OfferArgsFor['openPortfolio']
  >,
  rebalance: EVMOfferArgsShape as TypedPattern<OfferArgsFor['rebalance']>,
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

export type PortfolioBootstrapContext = {
  axelarChainsMap: AxelarChainsMap;
  chainHubTools: {
    getDenom: (brand: Brand) => Denom | undefined;
  };
  contractAddresses: EVMContractAddresses;
  zoeTools: GuestInterface<ZoeTools>;
  makePortfolioKit: (
    nobleAccount: NobleAccount,
    localAccount: HostInterface<LocalAccount>,
  ) => GuestInterface<PortfolioKit>;
  inertSubscriber: GuestInterface<ResolvedPublicTopic<never>['subscriber']>;
};

export type PortfolioInstanceContext = {
  axelarChainsMap: AxelarChainsMap;
  chainHubTools: {
    getDenom: (brand: Brand) => Denom | undefined;
  };
  contractAddresses: EVMContractAddresses;
  inertSubscriber: GuestInterface<ResolvedPublicTopic<never>['subscriber']>;
  zoeTools: GuestInterface<ZoeTools>;
};

export type BaseGmpArgs = {
  destinationEVMChain: AxelarChain;
  amount: AmountKeywordRecord;
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
  amount: AmountKeywordRecordShape,
  contractInvocationData: M.arrayOf(ContractCallShape),
});

export type LocalAccount = OrchestrationAccount<{ chainId: 'agoric-any' }>;
export type NobleAccount = OrchestrationAccount<{ chainId: 'noble-any' }>;
