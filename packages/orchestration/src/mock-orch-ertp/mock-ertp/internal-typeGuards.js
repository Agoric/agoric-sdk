import { M } from '@endo/patterns';

import { AmountShape, PaymentShape } from '@agoric/ertp';
import { AnyNatAmountShape } from '../../typeGuards.js';
import { mockIssuerInterfaces } from './typeGuards.js';
import { MockOrchAccountShape } from '../mock-orch/typeGuards.js';

export const RecoverySetShape = M.remotable('RecoverySet');
export const RecoveryFacetShape = M.remotable('RecoverFacet');

export const PaymentLedgerEntryShape = harden({
  keyShape: PaymentShape,
  valueShape: AnyNatAmountShape,
});

export const PaymentRecoveryEntryShape = harden({
  keyShape: PaymentShape,
  valueShape: RecoveryFacetShape,
});

/**
 * @param {Pattern} [brandShape]
 * @param {Pattern} [assetKindShape]
 * @param {Pattern} [amountShape]
 */
export const mockIssuerInterfacesPlus = (
  brandShape = undefined,
  assetKindShape = undefined,
  amountShape = AmountShape,
) => {
  const {
    IssuerI,
    MintI,
    PaymentI,
    PurseIKit: MockPurseIKit,
  } = mockIssuerInterfaces(brandShape, assetKindShape, amountShape);

  const RecoveryFacetI = M.interface('RecoveryFacet', {
    initPayment: M.call(PaymentShape).returns(),
    deletePayment: M.call(PaymentShape).returns(),
    getRecoverySetStore: M.call().returns(RecoverySetShape),
    getCurrentEncumberedBalance: M.call().returns(amountShape),
    encumber: M.call(amountShape).returns(),
    unencumber: M.call(amountShape).returns(),
    getOrchAcct: M.call().returns(MockOrchAccountShape),
  });

  const MockPurseIKitPlus = {
    ...MockPurseIKit,
    recoveryFacet: RecoveryFacetI,
  };

  return harden({
    IssuerI,
    MintI,
    PaymentI,
    PurseIKit: MockPurseIKitPlus,
  });
};
harden(mockIssuerInterfacesPlus);
