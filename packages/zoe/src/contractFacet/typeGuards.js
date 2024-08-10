import { M } from '@endo/patterns';
import { AmountKeywordRecordShape, IssuerRecordShape } from '../typeGuards.js';

export const ZcfSeatShape = M.remotable('zcfSeat');

export const ZcfMintI = M.interface('ZcfMint', {
  getIssuerRecord: M.call().returns(IssuerRecordShape),
  mintGains: M.call(AmountKeywordRecordShape)
    .optional(ZcfSeatShape)
    .returns(ZcfSeatShape),
  burnLosses: M.call(AmountKeywordRecordShape, ZcfSeatShape).returns(),
});

export const ZcfI = M.interface(
  'ZCF',
  {
    makeInvitation: M.call(M.raw(), M.string())
      .optional(M.record(), M.pattern())
      .returns(M.promise()),
    setTestJig: M.call().optional(M.raw()).returns(),
  },
  {
    defaultGuards: 'passable',
  },
);
