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
import { type Amount, type Brand, type NatValue } from '@agoric/ertp';
import type { TypedPattern } from '@agoric/internal';
import {
  AnyNatAmountShape,
  type AccountId,
  type CaipChainId,
} from '@agoric/orchestration';
import { type ContractCall } from '@agoric/orchestration/src/axelar-types.js';
import type {
  ContractInvitationSpec,
  ContinuingInvitationSpec,
} from '@agoric/smart-wallet/src/invitations.js';
import type { AmountKeywordRecord } from '@agoric/zoe';
import { AmountKeywordRecordShape } from '@agoric/zoe/src/typeGuards.js';
import { Fail } from '@endo/errors';
import { M } from '@endo/patterns';
import { AxelarChains, YieldProtocol } from './constants.js';
import type { start } from './portfolio.contract.js';
import type { ChainAccountKey, PortfolioKit } from './portfolio.exo.js';

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
type OfferArgs1 = {
  destinationEVMChain?: AxelarChain;
  usdnOut?: NatValue;
};

const offerArgsShape: TypedPattern<OfferArgs1> = M.splitRecord(
  {},
  {
    destinationEVMChain: M.or(...keys(AxelarChains)),
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
// #region ymax0 vstorage keys and values

/**
 * Creates vstorage path for portfolio status under published.ymax0.
 *
 * Portfolio status includes position counts, account mappings, and flow history.
 *
 * @param id - Portfolio ID number
 * @returns Path segments for vstorage
 */
export const makePortfolioPath = (id: number) => [`portfolio${id}`];

/**
 * Extracts portfolio ID from a vstorage path.
 *
 * @param path - Either a dot-separated string or array of path segments
 * @returns Portfolio ID number
 */
export const portfolioIdOfPath = (path: string | string[]) => {
  const segments = typeof path === 'string' ? path.split('.') : path;
  const [_group, segment] =
    segments[0] === 'published' ? segments.slice(1) : segments;
  const id = Number(segment.replace(/^portfolio/, ''));
  Number.isSafeInteger(id) || Fail`bad path: ${path}`;
  return id;
};

// XXX relate paths to types a la readPublished()
export type StatusFor = {
  portfolio: {
    positionCount: number;
    flowCount: number;
    // TODO: accountIdByChain: Record<ChainAccountKey, AccountId>;
    accountIdByChain: Record<string, AccountId>;
  };
  position: {
    protocol: YieldProtocol;
    accountId: AccountId;
    netTransfers: Amount<'nat'>;
    totalIn: Amount<'nat'>;
    totalOut: Amount<'nat'>;
  };
  // XXX refactor using AssetMoveDesc
  flow: {
    step: number;
    how: string;
    src: string;
    dest: string;
    amount: Amount<'nat'>;
    where?: string;
    error?: string;
  };
};

export const PortfolioStatusShape: TypedPattern<StatusFor['portfolio']> =
  M.splitRecord({
    positionCount: M.nat(),
    flowCount: M.nat(),
    accountIdByChain: M.recordOf(
      M.or('agoric', 'noble'), // ChainAccountKey
      M.string(), // AccountId
    ),
  });

/**
 * Creates vstorage path for position transfer history.
 *
 * Position tracking shows transfer history per yield protocol.
 * Used by {@link Position.publishStatus} to publish position state.
 *
 * @param parent - Portfolio ID
 * @param id - Position ID within the portfolio
 * @returns Path segments for vstorage
 */
export const makePositionPath = (parent: number, id: number) => [
  `portfolio${parent}`,
  'positions',
  `position${id}`,
];

export const PositionStatusShape: TypedPattern<StatusFor['position']> =
  M.splitRecord({
    protocol: M.or('USDN', 'Aave', 'Compound'), // YieldProtocol
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

export const FlowStatusShape: TypedPattern<StatusFor['flow']> = M.splitRecord(
  {
    step: M.nat(),
    how: M.string(),
    src: M.string(),
    dest: M.string(),
    amount: AnyNatAmountShape,
  },
  {
    where: M.string(),
    error: M.string(),
  },
);
// #endregion
