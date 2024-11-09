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

export const MinOrchAccountAddressShape = M.remotable('MinOrchAccountAddress');
export const MinOrchAccountShape = M.remotable('MinOrchAccount');
export const MinOrchChain = M.remotable('MinOrchChain');

export const MinOrchAccountAddressI = M.interface('MinOrchAccountAddress', {});

export const MinOrchAccountI = M.interface('MinOrchAccount', {
  getFullBalance: M.call().returns(M.eref(AmountShape)),
  transfer: M.call(MinOrchAccountAddressShape, AmountShape).returns(
    M.eref(M.undefined()),
  ),
  getAddress: M.call().returns(MinOrchAccountAddressShape),
});

export const MinOrchChainI = M.interface('MinOrchChain', {
  makeAccount: M.call(BrandShape).returns(M.eref(MinOrchAccountShape)),
});

// //////////////////////// Interfaces /////////////////////////////////////////

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
