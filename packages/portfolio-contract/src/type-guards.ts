/**
 * @file Patterns (aka type guards) for the portfolio contract's external interface.
 *
 * **Portfolio Management Interface**
 *
 * Use `makeOpenPortfolioInvitation()` to create a portfolio with initial funding across
 * yield protocols (USDN, Aave, Compound). The portfolio returns continuing invitation
 * makers for ongoing operations like rebalancing.
 *
 * **Proposals and Offer Args**
 * - {@link ProposalType.openPortfolio}: Initial funding with USDC, Access tokens, and protocol allocations
 * - {@link ProposalType.rebalance}: Add funds (give) or withdraw funds (want) from protocols
 * - {@link OfferArgsFor}: Cross-chain parameters like `destinationEVMChain` for EVM operations
 *
 * **VStorage Data**
 * Portfolio state published to `published.ymax0.portfolio${id}`:
 * - Portfolio status: position counts, account mappings, flow history (see {@link makePortfolioPath})
 * - Position tracking: transfer history per yield protocol (see {@link makePositionPath})
 * - Flow logging: operation progress for transparency (see {@link makeFlowPath})
 *
 * For usage examples, see `makeTrader` in {@link ../test/portfolio-actors.ts}.
 */
import {
  type Amount,
  type Brand,
  type NatAmount,
  type NatValue,
} from '@agoric/ertp';
import type { TypedPattern } from '@agoric/internal';
import {
  type CaipChainId
} from '@agoric/orchestration';
import type {
  ContinuingInvitationSpec,
  ContractInvitationSpec,
} from '@agoric/smart-wallet/src/invitations.js';
import { M } from '@endo/patterns';
import { AxelarChain, SupportedChain, YieldProtocol } from './constants.js';

// #region preliminaries
const { fromEntries, keys } = Object;

/**
 * @param brand must be a 'nat' brand, not checked
 */
export const makeNatAmountShape = (brand: Brand<'nat'>, min?: NatValue) =>
  harden({ brand, value: min ? M.gte(min) : M.nat() });
// #endregion

/**
 * Names suitable for use as `publicInvitationMaker` in {@link ContractInvitationSpec}.
 *
 * @see {@link start} for the contract implementation
 * @see {@link makeTrader.openPortfolio} for usage example
 */
export type PortfolioPublicFacet = Awaited<
  ReturnType<typeof start>
>['publicFacet'];
export type PortfolioInvitationMaker = keyof PortfolioPublicFacet;

/**
 * Names suitable for use as `invitationMakerName` in {@link ContinuingInvitationSpec}.
 *
 * These continuing invitation makers are returned from portfolio creation and enable
 * ongoing operations like rebalancing between yield protocols.
 *
 * @see {@link makeTrader.rebalance} for usage example
 */
export type PortfolioContinuingInvitationMaker =
  keyof PortfolioKit['invitationMakers'];

// #region Proposal Shapes
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
export type OpenPortfolioGive = {
  USDN?: Amount<'nat'>;
  NobleFees?: Amount<'nat'>;
  Access?: Amount<'nat'>;
} & ({} | GmpGive);

/**
 * Proposal shapes for portfolio operations.
 *
 * **openPortfolio**: Create portfolio with initial funding across protocols
 * **rebalance**: Add funds (give) or withdraw funds (want) from protocols
 */
export type ProposalType = {
  openPortfolio: { give: OpenPortfolioGive };
  rebalance:
    | { give: OpenPortfolioGive; want: {} }
    | { want: Partial<Record<YieldProtocol, Amount<'nat'>>>; give: {} };
};

const YieldProtocolShape = M.or(...keys(YieldProtocol));

export const makeProposalShapes = (
  usdcBrand: Brand<'nat'>,
  accessBrand?: Brand<'nat'>,
) => {
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

  // The give for openPortfolio and rebalance differ only in required properties
  const giveWith = x => {
    return M.splitRecord(
      x,
      { USDN: usdcAmountShape, NobleFees: usdcAmountShape },
      M.or(
        harden({}),
        AaveGiveShape,
        CompoundGiveShape,
        // TODO: and no others
        M.and(M.splitRecord(AaveGiveShape), M.splitRecord(CompoundGiveShape)),
      ),
    );
  };

  return {
    openPortfolio: M.splitRecord(
      {
        give: giveWith(
          accessBrand ? { Access: makeNatAmountShape(accessBrand, 1n) } : {},
        ),
      },
      { want: {}, exit: M.any() },
      {},
    ) as TypedPattern<ProposalType['openPortfolio']>,
    rebalance: M.or(
      M.splitRecord({ give: giveWith({}) }, { want: {}, exit: M.any() }, {}),
      M.splitRecord(
        { want: M.recordOf(YieldProtocolShape, usdcAmountShape) },
        { give: {}, exit: M.any() },
        {},
      ),
    ) as TypedPattern<ProposalType['rebalance']>,
  };
};
// #endregion

// #region Offer Args

type PoolPlaceInfo =
  | { protocol: 'USDN'; vault: null | 1 }
  | { protocol: 'Aave' | 'Compound'; chainName: AxelarChain };

export const PoolPlaces = {
  USDN: { protocol: 'USDN', vault: null }, // MsgSwap only
  USDNVault: { protocol: 'USDN', vault: 1 }, // MsgSwap, MsgLock
  Aave_Ethereum: { protocol: 'Aave', chainName: 'Ethereum' },
  Aave_Base: { protocol: 'Aave', chainName: 'Base' },
  Aave_Avalanche: { protocol: 'Aave', chainName: 'Avalanche' },
  Compound_Ethereum: { protocol: 'Compound', chainName: 'Ethereum' },
  Compound_Base: { protocol: 'Compound', chainName: 'Base' },
  Compound_Avalanche: { protocol: 'Compound', chainName: 'Avalanche' },
} as const satisfies Record<string, PoolPlaceInfo>;
harden(PoolPlaces);

/**
 * Names of places where a portfolio may have a position.
 */
export type PoolKey = keyof typeof PoolPlaces;

type OfferArgs1 = {
  destinationEVMChain?: AxelarChain;
  usdnOut?: NatValue;
};

const offerArgsShape: TypedPattern<OfferArgs1> = M.splitRecord(
  {},
  {
    destinationEVMChain: M.or(...keys(AxelarChain)),
    usdnOut: M.nat(),
  },
);

type PoolPlace = {
  protocol: YieldProtocol;
  // ... chain, pool #, ...
};

type PoolPlaceInfo =
  | { protocol: 'USDN'; vault: null | 1 }
  | { protocol: 'Aave' | 'Compound'; chainName: AxelarChain };

const PoolPlaces: Record<string, PoolPlaceInfo> = {
  USDN: { protocol: 'USDN', vault: null }, // MsgSwap only
  USDNVault: { protocol: 'USDN', vault: 1 }, // MsgSwap, MsgLock
  Aave_Arbitrum: { protocol: 'Aave', chainName: 'Arbitrum' },
  Aave_Avalanche: { protocol: 'Aave', chainName: 'Avalanche' },
  Aave_BNB: { protocol: 'Aave', chainName: 'BNB' },
  Aave_Ethereum: { protocol: 'Aave', chainName: 'Ethereum' },
  Aave_Fantom: { protocol: 'Aave', chainName: 'Fantom' },
  Aave_Optimism: { protocol: 'Aave', chainName: 'Optimism' },
  Aave_Polygon: { protocol: 'Aave', chainName: 'Polygon' },

  Compound_Arbitrum: { protocol: 'Compound', chainName: 'Arbitrum' },
  Compound_Avalanche: { protocol: 'Compound', chainName: 'Avalanche' },
  Compound_BNB: { protocol: 'Compound', chainName: 'BNB' },
  Compound_Ethereum: { protocol: 'Compound', chainName: 'Ethereum' },
  Compound_Fantom: { protocol: 'Compound', chainName: 'Fantom' },
  Compound_Optimism: { protocol: 'Compound', chainName: 'Optimism' },
  Compound_Polygon: { protocol: 'Compound', chainName: 'Polygon' },
} as const;
harden(PoolPlaces);

type PoolKey = keyof typeof PoolPlaces;
type BasisPoints = NatValue;

type AllocationStrategyInfo = {
  type: 'target-allocation';
  allocation: Record<PoolKey, BasisPoints>; // basis points
  // in basis-points
};

type XXXOfferArgs = {
  flow: MovementDesc[];
  strategy: AllocationStrategyInfo;
};

export type SeatKeyword = 'Cash' | 'Deposit';
export const seatKeywords: SeatKeyword[] = ['Cash', 'Deposit'];
harden(seatKeywords);

// TODO: how to ensure SeatKeyword is disjoint with SupportedChain?

export type AssetPlaceRef =
  | SeatKeyword
  | `${SupportedChain}.makeAccount()`
  | number;
const PositionRefShape = M.number();
const AssetPlaceRefShape = M.or(
  ...seatKeywords,
  ...Object.values(SupportedChain).map(c => `${c}.makeAccount()`),
  ...keys(PoolPlaces),
  PositionRefShape,
);

export const getChainNameOfPlaceRef = (
  ref: AssetPlaceRef,
): SupportedChain | undefined => {
  if (typeof ref !== 'string') return undefined;
  const m = ref.match(/^(?<chain>\w+)\.makeAccount\(\)$/);
  const chain = m?.groups?.chain;
  if (!chain) return undefined;
  // validation of external data is done by AssetPlaceRefShape
  // any bad ref that reaches here is a bug
  assert(keys(SupportedChain).includes(chain), `bad ref: ${ref}`);
  return chain as SupportedChain;
};

export type AssetPlaceDef =
  | AssetPlaceRef
  | { open: YieldProtocol; chainId?: CaipChainId };
const AssetPlaceDefShape = M.or(AssetPlaceRefShape, {
  open: M.or(...keys(PoolPlaces)),
});
export type MovementDesc = {
  amount: NatAmount;
  src: AssetPlaceRef;
  dest: AssetPlaceDef;
};

export type OfferArgsFor = {
  openPortfolio: OfferArgs1;
  rebalance: OfferArgs1;
};

export const OfferArgsShapeFor = {
  openPortfolio: offerArgsShape,
  rebalance: offerArgsShape,
};
harden(OfferArgsShapeFor);
// #endregion

export type EVMContractAddresses = {
  aavePool?: `0x${string}`;
  compound?: `0x${string}`;
  factory: `0x${string}`;
  usdc: `0x${string}`;
};
export type AxelarChainsMap = {
  [chain in AxelarChain]: {
    caip: CaipChainId; // TODO: move to chainHub
    axelarId: AxelarChain; // TODO: becomes chainName in chainHub
    contractAddresses: EVMContractAddresses;
  };
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
  contractAddresses: EVMContractAddressesShape,
});

export const AxelarChainsMapShape: TypedPattern<AxelarChainsMap> =
  M.splitRecord(
    fromEntries(
      keys(AxelarChain).map(chain => [chain, AxelarChainInfoPattern]),
    ) as Record<AxelarChain, typeof AxelarChainInfoPattern>,
  );

export type BaseGmpArgs = {
  destinationEVMChain: AxelarChain;
  keyword: string;
  amounts: AmountKeywordRecord;
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
  destinationEVMChain: M.or(...keys(AxelarChain)),
  keyword: M.string(),
  amounts: AmountKeywordRecordShape, // XXX brand should be exactly USDC
  contractInvocationData: M.arrayOf(ContractCallShape),
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
