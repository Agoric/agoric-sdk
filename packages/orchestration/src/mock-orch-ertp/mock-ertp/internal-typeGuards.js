import { M } from '@endo/patterns';

import {
  AmountShape,
  BrandShape,
  IssuerKitShape,
  PaymentShape,
  PurseShape,
} from '@agoric/ertp';
import { AnyNatAmountShape, DenomShape } from '../../typeGuards.js';
import { mockIssuerInterfaces } from './typeGuards.js';
import { MockOrchAccountShape } from '../mock-orch/typeGuards.js';

export const IssuerAdminShape = M.remotable('IssuerAdmin');
export const RecoverySetShape = M.remotable('RecoverySet');
export const RecoveryFacetShape = M.remotable('RecoverFacet');
export const Denom2IssuerKitShape = M.remotable('Denom2IssuerKit');
export const Brand2DenomShape = M.remotable('Brand2Denom');

const {
  mintRecoveryPurse: _1, // omit
  displayInfo: _2, // omit
  ...CoreIssuerKitShape
} = IssuerKitShape;

export const IssuerKitPlusShape = harden({
  ...CoreIssuerKitShape,
  admin: IssuerAdminShape,
});

export const PaymentLedgerEntryShape = harden({
  keyShape: PaymentShape,
  valueShape: AnyNatAmountShape,
});

export const PaymentRecoveryEntryShape = harden({
  keyShape: PaymentShape,
  valueShape: RecoveryFacetShape,
});

export const Denom2IssuerKitEntryShape = harden({
  keyShape: DenomShape,
  valueShape: IssuerKitPlusShape,
});

export const Brand2DenomEntryShape = harden({
  keyShape: BrandShape,
  valueShape: DenomShape,
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
    getOrchAcct: M.call().returns(M.eref(MockOrchAccountShape)),
  });

  const MockPurseIKitPlus = {
    ...MockPurseIKit,
    recoveryFacet: RecoveryFacetI,
  };

  const IssuerAdminI = M.interface('MockIssuerAdmin', {
    makePurse: M.call(M.eref(MockOrchAccountShape)).returns(M.eref(PurseShape)),
  });

  return harden({
    IssuerI,
    MintI,
    PaymentI,
    PurseIKit: MockPurseIKitPlus,
    IssuerAdminI,
  });
};
harden(mockIssuerInterfacesPlus);
