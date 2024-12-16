import type { Amount, Brand } from '@agoric/ertp';
const { fromEntries } = Object;

// @ts-expect-error Type 'Brand' does not satisfy the constraint 'string | number | symbol'
type BrandToBalance = Record<Brand, Amount>;

export const balancesFromPurses = (
  purses: { balance: Amount; brand: Brand }[],
): BrandToBalance =>
  fromEntries(purses.map(({ balance, brand }) => [brand, balance]));
