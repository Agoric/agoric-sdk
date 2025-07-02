/**
 * @file Patterns (aka type guards), especially for the external interface
 * of the contract.
 */
import {
  type Amount,
  type Brand,
  type NatAmount,
  type NatValue,
} from '@agoric/ertp';
import type { TypedPattern } from '@agoric/internal';
import type {
  AccountId,
  CaipChainId,
  OrchestrationAccount,
} from '@agoric/orchestration';
import { type ContractCall } from '@agoric/orchestration/src/axelar-types.js';
import type { AmountKeywordRecord } from '@agoric/zoe';
import { AmountKeywordRecordShape } from '@agoric/zoe/src/typeGuards.js';
import { M } from '@endo/patterns';
import { AxelarChains, YieldProtocol, SupportedChain } from './constants.js';

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

export type OpenPortfolioGive = { Access?: Amount<'nat'> } & (
  | { Deposit: NatAmount }
  | GmpGive
  | {}
);

export type ProposalType = {
  openPortfolio: { give: OpenPortfolioGive };
  rebalance:
    | { give: OpenPortfolioGive; want: {} } // XXX Access is incoherent here
    | { want: { Cash: NatAmount }; give: {} };
};

export const makeProposalShapes = (
  usdcBrand: Brand<'nat'>,
  accessBrand?: Brand<'nat'>,
) => {
  // TODO: Update usdcAmountShape, to include BLD/aUSDC after discussion with Axelar team
  const usdcAmountShape = makeNatAmountShape(usdcBrand);

  // The give for openPortfolio and rebalance differ only in required properties
  const giveWith = accessOpt =>
    M.splitRecord(accessOpt, {
      Deposit: usdcAmountShape,
      NobleFees: usdcAmountShape,
      Aave: usdcAmountShape,
      AaveGmp: usdcAmountShape,
      AaveAccount: usdcAmountShape,
      Compound: usdcAmountShape,
      CompoundGmp: usdcAmountShape,
      CompoundAccount: usdcAmountShape,
    });

  // {USDNSwapOut: Amount<'nat'>} | { USDNUnlock: Amount<'nat'> }
  const rebalanceWantShape = M.splitRecord(
    { Cash: usdcAmountShape },
    { NobleFees: usdcAmountShape },
    {},
  );
  const accessShape = accessBrand
    ? { Access: makeNatAmountShape(accessBrand, 1n) }
    : {};
  return {
    openPortfolio: M.splitRecord(
      { give: giveWith(accessShape) },
      { want: {}, exit: M.any() },
      {},
    ) as TypedPattern<ProposalType['openPortfolio']>,
    rebalance: M.or(
      M.splitRecord({ give: giveWith({}) }, { want: {}, exit: M.any() }, {}),
      M.splitRecord(
        { want: rebalanceWantShape },
        { give: {}, exit: M.any() },
        {},
      ),
    ) as TypedPattern<ProposalType['rebalance']>,
  };
};

type AxelarOfferArgs = {
  destinationEVMChain?: AxelarChain; // TODO: let AccountId express EVM chain
};

type PoolPlace = {
  protocol: YieldProtocol;
  // ... chain, pool #, ...
};

const PoolPlaces = {
  usdn: { protocol: 'USDN', vault: null },
  usdnLock: { protocol: 'USDN', vault: 1 },
};
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
  ...keys(PoolPlaces),
  PositionRefShape,
);

export const getChainNameOfPlaceRef = (ref: AssetPlaceRef) => {
  if (typeof ref !== 'string') return undefined;
  const m = ref.match(/^(?<chain>)\.makeAccount\(\)$/);
  return m?.groups?.chain;
};

export type AssetPlaceDef =
  | AssetPlaceRef
  | { open: YieldProtocol; chainId?: CaipChainId };
const AssetPlaceDefShap = M.or(AssetPlaceRefShape, {
  open: M.or(...keys(PoolPlaces)),
});
export type MovementDesc = {
  amount: NatAmount;
  src: AssetPlaceRef;
  dest: AssetPlaceDef;
};

export type OfferArgsFor = {
  openPortfolio: {} | XXXOfferArgs | AxelarOfferArgs;
  rebalance: {} | XXXOfferArgs;
};

export const makeOfferArgsShapes = (usdcBrand: Brand<'nat'>) => {
  const usdcAmountShape = makeNatAmountShape(usdcBrand, 1n);
  const movementDescShape = harden({
    amount: usdcAmountShape,
    src: AssetPlaceRefShape,
    dest: AssetPlaceDefShap,
  });

  return {
    openPortfolio: M.splitRecord(
      {},
      {
        flow: M.arrayOf(movementDescShape),
        destinationEVMChain: M.or(...keys(AxelarChains)),
      },
    ) as TypedPattern<OfferArgsFor['openPortfolio']>,
    rebalance: M.or({}, M.arrayOf(movementDescShape)) as TypedPattern<
      OfferArgsFor['rebalance']
    >,
  };
};
harden(makeOfferArgsShapes);

export type EVMContractAddresses = {
  aavePool: `0x${string}`;
  compound: `0x${string}`;
  factory: `0x${string}`;
  usdc: `0x${string}`;
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
      keys(AxelarChains).map(chain => [chain, AxelarChainInfoPattern]),
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
  destinationEVMChain: M.or(...keys(AxelarChains)),
  keyword: M.string(),
  amounts: AmountKeywordRecordShape, // XXX brand should be exactly USDC
  contractInvocationData: M.arrayOf(ContractCallShape),
});

export type LocalAccount = OrchestrationAccount<{ chainId: 'agoric-any' }>;
export type NobleAccount = OrchestrationAccount<{ chainId: 'noble-any' }>; // TODO: move to type-guards as external interface?

/** vstorage path for portfolio, under published.ymax0 */
export const makePortfolioPath = (id: number) => [`portfolio${id}`]; // ?portfolio=3
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
