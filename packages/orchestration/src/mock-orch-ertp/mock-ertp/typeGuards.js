// @jessie-check

import { M, getInterfaceGuardPayload } from '@endo/patterns';

import {
  AmountPatternShape,
  AmountShape,
  makeIssuerInterfaces,
  PaymentShape,
} from '@agoric/ertp';

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
    IssuerI,
    MintI,
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
  });

  const MockDepositFacetI = M.interface('MockDepositFacet', {
    receive: getInterfaceGuardPayload(MockPurseI).methodGuards.deposit,
  });

  const MockPurseIKit = harden({
    purse: MockPurseI,
    depositFacet: MockDepositFacetI,
  });

  return harden({
    IssuerI,
    MintI,
    PaymentI,
    PurseIKit: MockPurseIKit,
  });
};
harden(mockIssuerInterfaces);
