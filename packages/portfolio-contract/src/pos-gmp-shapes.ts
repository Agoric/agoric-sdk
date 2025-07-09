/** @file transitional proposal shapes for Axelar / Compound */
import type { Amount } from '@agoric/ertp';
import type { TypedPattern } from '@agoric/internal';
import { M } from '@endo/patterns';

export type AaveGive = {
  AaveGmp: Amount<'nat'>;
  AaveAccount: Amount<'nat'>;
  Aave: Amount<'nat'>;
};
export type CompoundGive = {
  CompoundGmp: Amount<'nat'>;
  CompoundAccount: Amount<'nat'>;
  Compound: Amount<'nat'>;
};
export type GmpGive = {} | AaveGive | CompoundGive | (AaveGive & CompoundGive);

export const makeGMPGiveRestShape = (
  usdcAmountShape: TypedPattern<Brand<'nat'>>,
) => {
  const AaveGiveShape = harden({
    Aave: usdcAmountShape,
    AaveGmp: usdcAmountShape,
    AaveAccount: usdcAmountShape,
  });
  const CompoundGiveShape = harden({
    Compound: usdcAmountShape,
    CompoundGmp: usdcAmountShape,
    CompoundAccount: usdcAmountShape,
  });
  return M.or(
    harden({}),
    AaveGiveShape,
    CompoundGiveShape,
    // XXX: and no others
    M.and(M.splitRecord(AaveGiveShape), M.splitRecord(CompoundGiveShape)),
  );
};
