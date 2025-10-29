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
import type { Brand, NatValue } from '@agoric/ertp';
import type { TypedPattern } from '@agoric/internal';
import { stripPrefix, tryNow } from '@agoric/internal/src/ses-utils.js';
import {
  AnyNatAmountShape,
  type AccountId,
  type Bech32Address,
} from '@agoric/orchestration';
import {
  AxelarChain,
  YieldProtocol,
  type AssetPlaceRef,
  type FlowDetail,
  type InstrumentId,
  type ProposalType,
  type StatusFor,
  type TargetAllocation,
} from '@agoric/portfolio-api';
import type {
  ContinuingInvitationSpec,
  ContractInvitationSpec,
} from '@agoric/smart-wallet/src/invitations.js';
import { Fail } from '@endo/errors';
import { isNat } from '@endo/nat';
import { M } from '@endo/patterns';
import type { EVMContractAddresses } from './portfolio.contract.js';

export type { OfferArgsFor } from './type-guards-steps.js';

// #region preliminaries
const { keys } = Object;

/** no runtime validation */
const AnyString = <_T>() => M.string();

/**
 * @param brand must be a 'nat' brand, not checked
 */
export const makeNatAmountShape = (brand: Brand<'nat'>, min?: NatValue) =>
  harden({ brand, value: min ? M.gte(min) : M.nat() });
// #endregion

// #region Proposal Shapes

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
    M.splitRecord({ want: { Cash: $Shape } }, { give: {}, exit: M.any() }, {}),
  ) as TypedPattern<ProposalType['rebalance']>;
  const withdraw = M.splitRecord(
    { want: { Cash: $Shape }, give: {} },
    { exit: M.any() },
    {},
  ) as TypedPattern<ProposalType['withdraw']>;
  const deposit = M.splitRecord(
    { give: { Deposit: $Shape }, want: {} },
    { exit: M.any() },
    {},
  ) as TypedPattern<ProposalType['deposit']>;
  return harden({ openPortfolio, rebalance, withdraw, deposit });
};
harden(makeProposalShapes);
// #endregion

// #region Offer Args

export type PoolPlaceInfo =
  | { protocol: 'USDN'; vault: null | 1; chainName: 'noble' }
  | { protocol: YieldProtocol; chainName: AxelarChain };

// XXX special handling. What's the functional difference from other places?
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
  Beefy_compoundUsdc_Optimism: {
    protocol: 'Beefy',
    chainName: 'Optimism',
  },
  Beefy_compoundUsdc_Arbitrum: {
    protocol: 'Beefy',
    chainName: 'Arbitrum',
  },
  Beefy_morphoSeamlessUsdc_Base: {
    protocol: 'Beefy',
    chainName: 'Base',
  },
} as const satisfies Partial<Record<InstrumentId, PoolPlaceInfo>>;

export const PoolPlaces = {
  USDN: { protocol: 'USDN', vault: null, chainName: 'noble' }, // MsgSwap only
  USDNVault: { protocol: 'USDN', vault: 1, chainName: 'noble' }, // MsgSwap, MsgLock
  Aave_Avalanche: { protocol: 'Aave', chainName: 'Avalanche' },
  Aave_Ethereum: { protocol: 'Aave', chainName: 'Ethereum' },
  Aave_Optimism: { protocol: 'Aave', chainName: 'Optimism' },
  Aave_Arbitrum: { protocol: 'Aave', chainName: 'Arbitrum' },
  Aave_Base: { protocol: 'Aave', chainName: 'Base' },
  Compound_Ethereum: { protocol: 'Compound', chainName: 'Ethereum' },
  Compound_Optimism: { protocol: 'Compound', chainName: 'Optimism' },
  Compound_Arbitrum: { protocol: 'Compound', chainName: 'Arbitrum' },
  Compound_Base: { protocol: 'Compound', chainName: 'Base' },
  ...BeefyPoolPlaces,
} as const satisfies Record<InstrumentId, PoolPlaceInfo>;
harden(PoolPlaces);

/**
 * Names of places where a portfolio may have a position.
 */
export type PoolKey = InstrumentId;

/** Ext for Extensible: includes PoolKeys in future upgrades */
export type PoolKeyExt = string;

/** Ext for Extensible: includes PoolKeys in future upgrades */
export const PoolKeyShapeExt = M.string();

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
 * Extracts portfolio ID number from a portfolio key (e.g., a vstorage path
 * segment).
 */
export const portfolioIdFromKey = (portfolioKey: `portfolio${number}`) => {
  // TODO: const strId = stripPrefix('portfolio', portfolioKey);
  // TODO: const id = Number(strId);
  const id = Number(portfolioKey.replace(/^portfolio/, ''));
  isNat(id) || Fail`bad key: ${portfolioKey}`;
  return id;
};

/**
 * Extracts flow ID number from a flow key (e.g., a vstorage path segment).
 */
export const flowIdFromKey = (flowKey: `flow${number}`) => {
  const strId = stripPrefix('flow', flowKey);
  const id = Number(strId);
  isNat(id) || Fail`bad key: ${flowKey}`;
  return id;
};

/**
 * Extracts portfolio ID number from a vstorage path.
 *
 * @param path - Either a dot-separated string or array of path segments
 * @returns Portfolio ID number
 */
export const portfolioIdOfPath = (path: string | string[]) => {
  const segments = typeof path === 'string' ? path.split('.') : path;
  const where = segments.indexOf('portfolios');
  where >= 0 || Fail`bad path: ${path}`;
  const segment = segments[where + 1];
  return tryNow(
    () => portfolioIdFromKey(segment as any),
    _err => Fail`bad path: ${path}`,
  );
};

export const FlowDetailShape: TypedPattern<FlowDetail> = M.or(
  { type: 'withdraw', amount: AnyNatAmountShape },
  { type: 'deposit', amount: AnyNatAmountShape },
  { type: 'rebalance' },
);

/** ChainNames including those in future upgrades */
type ChainNameExt = string;
const ChainNameExtShape: TypedPattern<ChainNameExt> = M.string();

export const PortfolioStatusShapeExt: TypedPattern<StatusFor['portfolio']> =
  M.splitRecord(
    {
      positionKeys: M.arrayOf(PoolKeyShapeExt),
      flowCount: M.number(),
      accountIdByChain: M.recordOf(ChainNameExtShape, AnyString<AccountId>()),
      policyVersion: M.number(),
      rebalanceCount: M.number(),
    },
    {
      depositAddress: AnyString<Bech32Address>(),
      nobleForwardingAddress: AnyString<Bech32Address>(),
      targetAllocation: TargetAllocationShapeExt,
      accountsPending: M.arrayOf(ChainNameExtShape),
      flowsRunning: M.recordOf(AnyString<`flow${number}`>(), FlowDetailShape),
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

export const PositionStatusShape: TypedPattern<StatusFor['position']> =
  M.splitRecord(
    {
      protocol: M.or(...Object.keys(YieldProtocol)), // YieldProtocol
      accountId: AnyString<AccountId>(),
      totalIn: AnyNatAmountShape,
      totalOut: AnyNatAmountShape,
    },
    {
      netTransfers: AnyNatAmountShape, // XXX obsolete
    },
  );

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
  { state: 'undo', step: M.number(), how: M.string() }, // XXX Not currently used
  { state: 'done' },
  M.splitRecord(
    { state: 'fail', step: M.number(), how: M.string(), error: M.string() },
    { where: AnyString<AssetPlaceRef>() },
    {},
  ),
);

export const FlowStepsShape: TypedPattern<StatusFor['flowSteps']> = M.arrayOf({
  how: M.string(),
  amount: AnyNatAmountShape,
  src: AnyString<AssetPlaceRef>(),
  dest: AnyString<AssetPlaceRef>(),
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

// Backwards compat
export type { FlowDetail, ProposalType, StatusFor, TargetAllocation };
