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
import type { Amount, Brand, NatAmount, NatValue } from '@agoric/ertp';
import type { TypedPattern } from '@agoric/internal';
import {
  AnyNatAmountShape,
  type AccountId,
  type Bech32Address,
  type CosmosChainAddress,
} from '@agoric/orchestration';
import {
  AxelarChain,
  SupportedChain,
  YieldProtocol,
} from '@agoric/portfolio-api/src/constants.js';
import type {
  ContinuingInvitationSpec,
  ContractInvitationSpec,
} from '@agoric/smart-wallet/src/invitations.js';
import { Fail } from '@endo/errors';
import { M } from '@endo/patterns';
import type { EVMContractAddresses, start } from './portfolio.contract.js';
import type { PortfolioKit } from './portfolio.exo.js';
import type { AssetPlaceRef } from './type-guards-steps.js';

export type { OfferArgsFor } from './type-guards-steps.js';

/* eslint jsdoc/require-returns-type: 0 */

// #region preliminaries
const { keys } = Object;

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
type Empty = Record<never, Amount>;

/**
 * Proposal shapes for portfolio operations.
 *
 * **openPortfolio**: Create portfolio with initial funding across protocols
 * **rebalance**: Add funds (give) or withdraw funds (want) from protocols
 */
export type ProposalType = {
  openPortfolio: {
    give: {
      /** required iff the contract was started with an Access issuer */
      Access?: NatAmount;
      Deposit?: NatAmount;
    };
  };
  rebalance:
    | { give: { Deposit?: NatAmount }; want: Empty }
    | { want: { Cash: NatAmount }; give: Empty };
};

export const makeProposalShapes = (
  usdcBrand: Brand<'nat'>,
  accessBrand?: Brand<'nat'>,
) => {
  const $Shape = makeNatAmountShape(usdcBrand);
  const accessShape = harden({
    ...(accessBrand && { Access: makeNatAmountShape(accessBrand, 1n) }),
  });

  const openPortfolio = M.splitRecord(
    {
      give: M.splitRecord(accessShape, { Deposit: $Shape }, {}),
    },
    { want: {}, exit: M.any() },
    {},
  ) as TypedPattern<ProposalType['openPortfolio']>;
  const rebalance = M.or(
    M.splitRecord(
      { give: M.splitRecord({}, { Deposit: $Shape }, {}) },
      { want: {}, exit: M.any() },
      {},
    ),
    M.splitRecord(
      { want: M.splitRecord({ Cash: $Shape }, {}, {}) },
      { give: {}, exit: M.any() },
      {},
    ),
  ) as TypedPattern<ProposalType['rebalance']>;
  return harden({ openPortfolio, rebalance });
};
harden(makeProposalShapes);
// #endregion

// #region Offer Args

export type PoolPlaceInfo =
  | { protocol: 'USDN'; vault: null | 1; chainName: 'noble' }
  | { protocol: 'Aave' | 'Compound' | 'Beefy'; chainName: AxelarChain };

export const BeefyPoolPlaces = {
  Beefy_re7_Avalanche: {
    protocol: 'Beefy',
    chainName: 'Avalanche',
  },
  Beefy_morphoGauntletUsdc_Ethereum: {
    protocol: 'Beefy',
    chainName: 'Ethereum',
  },
  Beefy_morphoSmokehouseUsdc_Ethereum: {
    protocol: 'Beefy',
    chainName: 'Ethereum',
  },
  Beefy_morphoSeamlessUsdc_Base: {
    protocol: 'Beefy',
    chainName: 'Base',
  },
  Beefy_compoundUsdc_Optimism: {
    protocol: 'Beefy',
    chainName: 'Optimism',
  },
  Beefy_compoundUsdc_Arbitrum: {
    protocol: 'Beefy',
    chainName: 'Arbitrum',
  },
} as const satisfies Record<string, PoolPlaceInfo>;

export const PoolPlaces = {
  USDN: { protocol: 'USDN', vault: null, chainName: 'noble' }, // MsgSwap only
  USDNVault: { protocol: 'USDN', vault: 1, chainName: 'noble' }, // MsgSwap, MsgLock
  Aave_Avalanche: { protocol: 'Aave', chainName: 'Avalanche' },
  Aave_Ethereum: { protocol: 'Aave', chainName: 'Ethereum' },
  Aave_Optimism: { protocol: 'Aave', chainName: 'Optimism' },
  Aave_Arbitrum: { protocol: 'Aave', chainName: 'Arbitrum' },
  Aave_Base: { protocol: 'Aave', chainName: 'Base' },
  Compound_Avalanche: { protocol: 'Compound', chainName: 'Avalanche' },
  Compound_Ethereum: { protocol: 'Compound', chainName: 'Ethereum' },
  Compound_Optimism: { protocol: 'Compound', chainName: 'Optimism' },
  Compound_Arbitrum: { protocol: 'Compound', chainName: 'Arbitrum' },
  Compound_Base: { protocol: 'Compound', chainName: 'Base' },
  ...BeefyPoolPlaces,
} as const satisfies Record<string, PoolPlaceInfo>;
harden(PoolPlaces);

/**
 * Names of places where a portfolio may have a position.
 */
export type PoolKey = keyof typeof PoolPlaces;

/** Ext for Extensible: includes PoolKeys in future upgrades */
export type PoolKeyExt = string;

/** Ext for Extensible: includes PoolKeys in future upgrades */
export const PoolKeyShapeExt = M.string();

/**
 * Target allocation mapping from PoolKey to numerator (typically in basis points).
 * Denominator is implicitly the sum of all numerators.
 */
export type TargetAllocation = Partial<Record<PoolKey, NatValue>>;

export const TargetAllocationShape: TypedPattern<TargetAllocation> = M.recordOf(
  M.or(...keys(PoolPlaces)),
  M.nat(),
);

export const TargetAllocationShapeExt: TypedPattern<Record<string, NatValue>> =
  M.recordOf(PoolKeyShapeExt, M.nat());

// #endregion

// #region ymax0 vstorage keys and values
// XXX the vstorage path API is kinda awkward to use; see ymax-deploy.test.ts

/**
 * Creates vstorage path for portfolio status under published.ymax0.
 *
 * Portfolio status includes position counts, account mappings, and flow history.
 *
 * @param id - Portfolio ID number
 * @returns Path segments for vstorage
 */
export const makePortfolioPath = (id: number): [`portfolio${number}`] => [
  `portfolio${id}`,
];

/**
 * Extracts portfolio ID from a vstorage path.
 *
 * @param path - Either a dot-separated string or array of path segments
 * @returns Portfolio ID number
 */
export const portfolioIdOfPath = (path: string | string[]) => {
  const segments = typeof path === 'string' ? path.split('.') : path;
  const where = segments.indexOf('portfolios');
  where >= 0 || Fail`bad path: ${path}`;
  const segment = segments[where + 1];
  const id = Number(segment.replace(/^portfolio/, ''));
  Number.isSafeInteger(id) || Fail`bad path: ${path}`;
  return id;
};

type FlowStatus =
  | { state: 'run'; step: number; how: string }
  | { state: 'undo'; step: number; how: string }
  | { state: 'done' }
  | { state: 'fail'; step: number; how: string; error: string; where?: string };

type FlowSteps = {
  how: string;
  amount: Amount<'nat'>;
  src: AssetPlaceRef;
  dest: AssetPlaceRef;
}[];

/** ChainNames including those in future upgrades */
type ChainNameExt = string;
const ChainNameExtShape: TypedPattern<ChainNameExt> = M.string();

// XXX relate paths to types a la readPublished()
export type StatusFor = {
  contract: {
    contractAccount: CosmosChainAddress['value'];
  };
  portfolios: {
    addPortfolio: `portfolio${number}`;
  };
  portfolio: {
    positionKeys: PoolKeyExt[];
    flowCount: number;
    accountIdByChain: Record<ChainNameExt, AccountId>;
    accountsPending?: SupportedChain[];
    depositAddress?: Bech32Address;
    targetAllocation?: TargetAllocation;
  };
  position: {
    protocol: YieldProtocol;
    accountId: AccountId;
    netTransfers: Amount<'nat'>;
    totalIn: Amount<'nat'>;
    totalOut: Amount<'nat'>;
  };
  flow: FlowStatus;
  flowSteps: FlowSteps;
};

export const PortfolioStatusShapeExt: TypedPattern<StatusFor['portfolio']> =
  M.splitRecord(
    {
      positionKeys: M.arrayOf(PoolKeyShapeExt),
      flowCount: M.number(),
      accountIdByChain: M.recordOf(
        ChainNameExtShape,
        M.string(), // XXX no runtime validation of AccountId
      ),
    },
    {
      depositAddress: M.string(), // XXX no runtime validation of Bech32Address
      targetAllocation: TargetAllocationShapeExt,
      accountsPending: M.arrayOf(ChainNameExtShape),
    },
  );

/**
 * Creates vstorage path for position transfer history.
 *
 * Position tracking shows transfer history per yield protocol.
 * Used by {@link Position.publishStatus} to publish position state.
 *
 * @param parent - Portfolio ID
 * @param key - PoolKey
 * @returns Path segments for vstorage
 */
export const makePositionPath = (parent: number, key: PoolKeyExt) => [
  `portfolio${parent}`,
  'positions',
  key,
];

export const PositionStatusShape: TypedPattern<StatusFor['position']> = harden({
  protocol: M.or(...Object.keys(YieldProtocol)), // YieldProtocol
  accountId: M.string(), // AccountId
  netTransfers: AnyNatAmountShape, // XXX constrain brand to USDC
  totalIn: AnyNatAmountShape,
  totalOut: AnyNatAmountShape,
});

/**
 * Creates vstorage path for flow operation logging.
 *
 * Flow logging provides real-time operation progress for transparency.
 * Used by {@link PortfolioKit.reporter.publishFlowStatus} to track rebalancing operations.
 *
 * @param parent - Portfolio ID
 * @param id - Flow ID within the portfolio
 * @returns Path segments for vstorage
 */
export const makeFlowPath = (parent: number, id: number) => [
  `portfolio${parent}`,
  'flows',
  `flow${id}`,
];

export const makeFlowStepsPath = (parent: number, id: number) => [
  `portfolio${parent}`,
  'flows',
  `flow${id}`,
  'steps',
];

export const FlowStatusShape: TypedPattern<StatusFor['flow']> = M.or(
  { state: 'run', step: M.number(), how: M.string() },
  { state: 'undo', step: M.number(), how: M.string() },
  { state: 'done' },
  M.splitRecord(
    { state: 'fail', step: M.number(), how: M.string(), error: M.string() },
    { where: M.string() },
    {},
  ),
);

export const FlowStepsShape: TypedPattern<StatusFor['flowSteps']> = M.arrayOf({
  how: M.string(),
  amount: AnyNatAmountShape,
  src: M.string(), // AssetPlaceRef
  dest: M.string(), // AssetPlaceRef
});
// #endregion

// XXX deployment concern, not part of contract external interface
// but avoid changing the import from the deploy package

export type EVMContractAddressesMap = {
  [chain in AxelarChain]: EVMContractAddresses;
};

// keep these types imported for IDE navigation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const keepDocsTypesImported:
  | undefined
  | ContinuingInvitationSpec
  | ContractInvitationSpec = undefined;
