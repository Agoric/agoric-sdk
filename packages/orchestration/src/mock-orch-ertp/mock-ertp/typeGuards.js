// @jessie-check

import { M, getInterfaceGuardPayload } from '@endo/patterns';

import {
  AmountPatternShape,
  AmountShape,
  makeIssuerInterfaces,
  PaymentShape,
} from '@agoric/ertp';

export const MockPurseShape = M.remotable('MockPurse');
export const MockIssuerShape = M.remotable('MockIssuer');
export const MockMintShape = M.remotable('MockMint');

/**
 * @param {Pattern} [brandShape]
 * @param {Pattern} [assetKindShape]
 * @param {Pattern} [amountShape]
 */
export const mockIssuerInterfaces = (
  brandShape = undefined,
  assetKindShape = undefined,
  amountShape = AmountShape,
) => {
  const {
    IssuerI: OriginalIssuerI,
    MintI: OriginalMintI,
    PaymentI,
    PurseIKit: { purse: OriginalPurseI },
  } = makeIssuerInterfaces(brandShape, assetKindShape, amountShape);

  const { methodGuards: originalPurseMethodGuards } =
    getInterfaceGuardPayload(OriginalPurseI);

  const MockPurseI = M.interface('MockPurse', {
    ...originalPurseMethodGuards,
    getCurrentFullBalance: M.call().returns(M.eref(amountShape)),
    getCurrentEncumberedBalance: M.call().returns(amountShape),
    getCurrentUnencumberedBalance: M.call().returns(M.eref(amountShape)),
    getCurrentAmount: M.call().returns(M.eref(amountShape)),
    deposit: M.call(PaymentShape)
      .optional(AmountPatternShape)
      .returns(M.eref(amountShape)),
    withdraw: M.call(amountShape).returns(M.eref(PaymentShape)),
  });

  const MockDepositFacetI = M.interface('MockDepositFacet', {
    receive: getInterfaceGuardPayload(MockPurseI).methodGuards.deposit,
  });

  const MockPurseIKit = harden({
    purse: MockPurseI,
    depositFacet: MockDepositFacetI,
  });

  const { methodGuards: originalIssuerMethodGuards } =
    getInterfaceGuardPayload(OriginalIssuerI);

  const MockIssuerI = M.interface('MockIssuer', {
    ...originalIssuerMethodGuards,
    makeEmptyPurse: M.call().returns(M.eref(MockPurseShape)),
  });

  const { methodGuards: originalMintMethodGuards } =
    getInterfaceGuardPayload(OriginalMintI);

  const MockMintI = M.interface('MockMint', {
    ...originalMintMethodGuards,
    mintPayment: M.call(amountShape).returns(M.eref(PaymentShape)),
  });

  return harden({
    IssuerI: MockIssuerI,
    MintI: MockMintI,
    PaymentI,
    PurseIKit: MockPurseIKit,
  });
};
harden(mockIssuerInterfaces);
