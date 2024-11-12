// @jessie-check

import { M, getInterfaceGuardPayload } from '@endo/patterns';

import {
  AmountPatternShape,
  AmountShape,
  AssetKindShape,
  BrandShape,
  makeIssuerInterfaces,
  PaymentShape,
} from '@agoric/ertp';
import {
  ChainInfoShape,
  DenomShape,
  DenomAmountShape,
} from '@agoric/orchestration';

// //////////////////////// Orchestration-like /////////////////////////////////

export const MinOrchAccountShape = M.remotable('MinOrchAccount');
export const MinChainShape = M.remotable('MinChain');
export const MinOrchestratorShape = M.remotable('MinOrchestrator');

/**
 * @see {ChainAddressShape}
 * @see {MinChainAcctAddr}
 */
export const MinChainAcctAddrShape = harden({
  chainId: M.string(),
  value: M.string(),
});

/**
 * @see {orchestrationAccountMethods}
 * @see {MinOrchAccount}
 */
export const MinOrchAccountI = M.interface('MinOrchAccount', {
  getAddress: M.call().returns(MinChainAcctAddrShape),
  getBalances: M.call().returns(M.eref(M.arrayOf(DenomAmountShape))),
  getBalance: M.call(M.string()).returns(M.eref(DenomAmountShape)),
  transfer: M.call(MinChainAcctAddrShape, DenomAmountShape).returns(
    M.eref(M.undefined()),
  ),
});

/**
 * @see {DenomInfoShape}
 * @see {MinDenomInfo}
 */
export const MinDenomInfoShape = harden({
  brand: BrandShape,
  chain: MinChainShape,
});

/**
 * @see {chainFacadeMethods}
 * @see {MinChain}
 * @see {OrchestratorI}
 */
export const MinChainI = M.interface('MinChain', {
  getChainInfo: M.call().returns(M.eref(ChainInfoShape)),
  makeAccount: M.call().returns(M.eref(MinOrchAccountShape)),

  // In the real API, these are on OrchestratorI
  getDenomInfo: M.call(DenomShape).returns(MinDenomInfoShape),
  asAmount: M.call(DenomAmountShape).returns(AmountShape),
});

/**
 * @see {OrchestratorI}
 * @see {MinOrchestrator}
 */
export const MinOrchestratorI = M.interface('MinOrchestrator', {
  getChain: M.call(M.string()).returns(M.eref(MinChainShape)),
});

// //////////////////////// ERTP-like //////////////////////////////////////////

/**
 * @param {Pattern} [brandShape]
 * @param {Pattern} [assetKindShape]
 * @param {Pattern} [amountShape]
 */
export const makeOrchIssuerInterfaces = (
  brandShape = BrandShape,
  assetKindShape = AssetKindShape,
  amountShape = AmountShape,
) => {
  const {
    IssuerI,
    MintI,
    PaymentI,
    PurseIKit: { purse: OriginalPurseI },
  } = makeIssuerInterfaces(brandShape, assetKindShape, amountShape);

  const { methodGuards: originalPurseMethodGuards } =
    getInterfaceGuardPayload(OriginalPurseI);

  const OrchPurseI = M.interface('OrchPurse', {
    ...originalPurseMethodGuards,
    getCurrentAmount: M.call().returns(M.eref(amountShape)),
    getCurrentFullBalance: M.call().returns(M.eref(amountShape)),
    deposit: M.call(PaymentShape)
      .optional(AmountPatternShape)
      .returns(M.eref(amountShape)),
  });

  const OrchDepositFacetI = M.interface('OrchDepositFacet', {
    receive: getInterfaceGuardPayload(OrchPurseI).methodGuards.deposit,
  });

  const OrchPurseIKit = harden({
    purse: OrchPurseI,
    depositFacet: OrchDepositFacetI,
  });

  return harden({
    IssuerI,
    MintI,
    PaymentI,
    PurseIKit: OrchPurseIKit,
  });
};
harden(makeOrchIssuerInterfaces);
