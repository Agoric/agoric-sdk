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
import type { Brand } from '@agoric/ertp';
import type { TypedPattern } from '@agoric/internal';
import {
  AxelarChain,
  makeNatAmountShape,
  type FlowDetail,
  type ProposalType,
  type StatusFor,
  type TargetAllocation,
} from '@agoric/portfolio-api';
import type {
  ContinuingInvitationSpec,
  ContractInvitationSpec,
} from '@agoric/smart-wallet/src/invitations.js';
import { M } from '@endo/patterns';
import type { EVMContractAddresses } from './portfolio.contract.js';

export type { OfferArgsFor } from './type-guards-steps.js';

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

// #region vstorage helpers (re-exported from portfolio-api)
export {
  BeefyPoolPlaces,
  FlowDetailShape,
  FlowStatusShape,
  FlowStepsShape,
  PoolKeyShapeExt,
  PoolPlaces,
  PortfolioStatusShapeExt,
  PositionStatusShape,
  TargetAllocationShape,
  TargetAllocationShapeExt,
  flowIdFromKey,
  makeFlowPath,
  makeFlowStepsPath,
  makeNatAmountShape,
  makePortfolioPath,
  makePositionPath,
  portfolioIdFromKey,
  portfolioIdOfPath,
} from '@agoric/portfolio-api';
export type { PoolKey, PoolKeyExt } from '@agoric/portfolio-api';
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
