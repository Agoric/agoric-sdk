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
import {
  AmountKeywordRecordShape,
  InvitationShape,
} from '@agoric/zoe/src/typeGuards.js';
import { M } from '@endo/patterns';
import { YieldProtocol, SupportedChain, AxelarChain } from './constants.js';

const { fromEntries, keys, values } = Object;

export const PublicFacetI = M.interface('PublicFacet', {
  makeOpenPortfolioInvitation: M.callWhen().returns(InvitationShape),
});

/**
 * @param brand must be a 'nat' brand, not checked
 */
export const makeNatAmountShape = (brand: Brand<'nat'>, min?: NatValue) =>
  harden({ brand, value: min ? M.gte(min) : M.nat() });

export type ProposalType = {
  openPortfolio: {
    give: {
      /** required iff the contract was started with an Access issuer */
      Access?: NatAmount;
      Deposit?: NatAmount;
    };
  };
  rebalance:
    | { give: { Deposit?: NatAmount }; want: {} }
    | { want: { Cash: NatAmount }; give: {} };
};

export const makeProposalShapes = (
  usdcBrand: Brand<'nat'>,
  accessBrand?: Brand<'nat'>,
) => {
  // TODO: Update usdcAmountShape, to include BLD/aUSDC after discussion with Axelar team
  const usdcAmountShape = makeNatAmountShape(usdcBrand);

  const feeShapes = {
    AaveGmp: usdcAmountShape,
    AaveAccount: usdcAmountShape,
    CompoundGmp: usdcAmountShape,
    CompoundAccount: usdcAmountShape,
  };

  const rebalanceGiveShapes = {
    Deposit: usdcAmountShape,
    ...feeShapes,
  };

  const accessShape = accessBrand
    ? { Access: makeNatAmountShape(accessBrand, 1n) }
    : {};

  const openPortfolio = M.splitRecord(
    { give: M.splitRecord(accessShape, rebalanceGiveShapes, {}) },
    { want: {}, exit: M.any() },
    {},
  ) as TypedPattern<ProposalType['openPortfolio']>;
  const rebalance = M.or(
    M.splitRecord(
      { give: M.splitRecord({}, rebalanceGiveShapes, {}) },
      { want: {}, exit: M.any() },
      {},
    ),
    M.splitRecord(
      { want: M.splitRecord({ Cash: usdcAmountShape }, {}) },
      { give: {}, exit: M.any() },
      {},
    ),
  ) as TypedPattern<ProposalType['rebalance']>;
  return harden({ openPortfolio, rebalance });
};
harden(makeProposalShapes);

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

export type PoolKey = keyof typeof PoolPlaces;
type BasisPoints = number;

type AllocationStrategyInfo = {
  type: 'target-allocation';
  allocation: Record<PoolKey, BasisPoints>;
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
  ...values(SupportedChain).map(c => `${c}.makeAccount()`),
  ...keys(PoolPlaces),
  PositionRefShape,
);

// XXX NEEDSTEST: check that all SupportedChains match; no `.`s etc.
export const accountRefPattern = /^(?<chain>\w+)\.makeAccount\(\)$/;

export const getChainNameOfPlaceRef = (
  ref: AssetPlaceRef,
): SupportedChain | undefined => {
  if (typeof ref !== 'string') return undefined;
  const m = ref.match(accountRefPattern);
  const chain = m?.groups?.chain;
  if (!chain) return undefined;
  // validation of external data is done by AssetPlaceRefShape
  // any bad ref that reaches here is a bug
  assert(keys(SupportedChain).includes(chain), `bad ref: ${ref}`);
  return chain as SupportedChain;
};

export type AssetPlaceDef =
  | AssetPlaceRef
  | { open: PoolKey; chainId?: CaipChainId };
const AssetPlaceDefShap = M.or(AssetPlaceRefShape, {
  open: M.or(...keys(PoolPlaces)),
});
export type MovementDesc = {
  amount: NatAmount;
  src: AssetPlaceRef;
  dest: AssetPlaceDef;
};

export type OfferArgsFor = {
  openPortfolio: {} | XXXOfferArgs;
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
        destinationEVMChain: M.or(...keys(AxelarChain)),
      },
    ) as TypedPattern<OfferArgsFor['openPortfolio']>,
    rebalance: M.splitRecord(
      {},
      { flow: M.arrayOf(movementDescShape) },
      {},
    ) as TypedPattern<OfferArgsFor['rebalance']>,
  };
};
harden(makeOfferArgsShapes);

export type EVMContractAddresses = {
  aavePool: `0x${string}`;
  compound: `0x${string}`;
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
