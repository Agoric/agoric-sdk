import { Decimal } from '@cosmjs/math';

export const fun = () => {
  const e18 = 10n ** 18n;
  return Decimal.fromAtomics(`${e18}`, 18);
};
