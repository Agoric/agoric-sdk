import type { TypedPattern } from '@agoric/internal';

// #region Proposal Shapes

export const makeUSDNGiveFields = (
  usdcAmountShape: TypedPattern<Brand<'nat'>>,
) => ({ USDN: usdcAmountShape, NobleFees: usdcAmountShape });
