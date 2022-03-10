/* eslint-disable no-use-before-define */
/* global foo */
const M = foo();

export const MatchDisplayInfo = M.rest(
  {
    assetKind: M.or('nat', 'set'),
  }.optionals({
    decimalPlaces: M.number(),
  }),
);

export const BrandI = M.interface({
  isMyIssuer: M.callWhen(M.await(IssuerI)).returns(M.boolean()),
  getAllegedName: M.call().returns(M.string()),
  getDisplayInfo: M.call().returns(MatchDisplayInfo),
});

export const MatchAmount = {
  brand: BrandI,
  value: M.or(M.bigint(), M.array()),
};

export const IssuerI = M.interface({
  getBrand: M.call().returns(BrandI),
  getAllegedName: M.call().returns(M.string()),
  getAssetKind: M.call().returns(M.or('nat', 'set')),
  getDisplayInfo: M.call().returns(MatchDisplayInfo),
  makeEmptyPurse: M.call().returns(PurseI),

  isLive: M.callWhen(M.await(PaymentI)).returns(M.boolean()),
  getAmountOf: M.callWhen(M.await(PaymentI)).returns(MatchAmount),
});

export const PaymentI = M.interface({
  getAllegedBrand: M.call().returns(BrandI),
});

export const PurseI = M.interface({
  getAllegedBrand: M.call().returns(BrandI),
  deposit: M.apply(M.rest([PaymentI]).optionals([MatchAmount])).returns(
    MatchAmount,
  ),
  withdraw: M.call(MatchAmount).returns(PaymentI),
});
