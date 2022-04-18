/* eslint-disable no-use-before-define */
import { M, I } from '@agoric/store';

export const MatchDisplayInfo = M.rest(
  {
    assetKind: M.or('nat', 'set'),
  }.optionals({
    decimalPlaces: M.number(),
  }),
);

export const BrandI = I.interface('Brand', {
  isMyIssuer: I.callWhen(I.await(IssuerI)).returns(M.boolean()),
  getAllegedName: I.call().returns(M.string()),
  getDisplayInfo: I.call().returns(MatchDisplayInfo),
});

export const MatchAmount = {
  brand: BrandI,
  value: M.or(M.bigint(), M.array()),
};

export const IssuerI = I.interface('Issuer', {
  getBrand: I.call().returns(BrandI),
  getAllegedName: I.call().returns(M.string()),
  getAssetKind: I.call().returns(M.or('nat', 'set')),
  getDisplayInfo: I.call().returns(MatchDisplayInfo),
  makeEmptyPurse: I.call().returns(PurseI),

  isLive: I.callWhen(I.await(PaymentI)).returns(M.boolean()),
  getAmountOf: I.callWhen(I.await(PaymentI)).returns(MatchAmount),
});

export const PaymentI = I.interface('Payment', {
  getAllegedBrand: I.call().returns(BrandI),
});

export const PurseI = I.interface('Purse', {
  getAllegedBrand: I.call().returns(BrandI),
  deposit: I.apply(M.rest([PaymentI], M.partial([MatchAmount]))).returns(
    MatchAmount,
  ),
  withdraw: I.call(MatchAmount).returns(PaymentI),
});
