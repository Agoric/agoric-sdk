// @ts-check
// @jessie-check
/* eslint-disable no-restricted-globals */
import { E } from '@endo/far';

const { details: X, quote: q } = assert;

// TODO: add to jessie std https://github.com/agoric-labs/jessica/issues/59
// ack: https://lea.verou.me/2018/06/easy-dynamic-regular-expressions-with-tagged-template-literals-and-proxies/
const regex =
  flags =>
  (strings, ...values) => {
    const pattern =
      strings[0] +
      values.map((v, i) => RegExp.escape(v) + strings[+(i + 1)]).join('');
    return RegExp(pattern, flags);
  };

// TODO: import from jessie-std
// eslint-disable-next-line no-restricted-syntax
const makeMap = (...args) => new Map(...args);

/**
 * @param {bigint} frac
 * @param {number} exp
 */
const pad0 = (frac, exp) =>
  `${`${'0'.repeat(exp)}${frac}`.slice(-exp)}`.replace(regex()`0+$`, '');

/** @param { bigint } whole */
const separators = whole => {
  const sep = '_';
  // ack: https://stackoverflow.com/a/45950572/7963, https://regex101.com/
  const revStr = s => s.split('').reverse().join('');
  const lohi = revStr(`${whole}`);
  const s = lohi.replace(
    regex('g')`(?=\d{4})(\d{3})`,
    (m, p1) => `${p1}${sep}`,
  );
  return revStr(s);
};

/**
 * @param {bigint} n
 * @param {number} exp
 */
export const decimal = (n, exp) => {
  const unit = 10n ** BigInt(exp);
  const [whole, frac] = [n / unit, n % unit];
  return frac !== 0n
    ? `${separators(whole)}.${pad0(frac, exp)}`
    : `${separators(whole)}`;
};

export const collectBrandInfo = async brands => {
  const entries = await Promise.all(
    brands.map(async brand => {
      const [name, displayInfo] = await Promise.all([
        E(brand).getAllegedName(),
        E(brand).getDisplayInfo(),
      ]);
      return [brand, { name, displayInfo }];
    }),
  );
  return makeMap(entries);
};

/**
 * @param {BrandInfo} brandInfo
 * @typedef {Map<Brand, { name: string, displayInfo: DisplayInfo }>} BrandInfo
 */
export const makeFormatter = brandInfo => {
  const theBrand = b =>
    brandInfo.get(b) || assert.fail(X`unknown brand: ${q(b)}`);
  const theDecimals = b =>
    theBrand(b).displayInfo.decimalPlaces ||
    assert.fail(X`missing decimalPlaces: ${q(b)}`);

  const showBrand = b => theBrand(b).name;
  const showAmount = ({ brand, value }) => {
    const b = `${showBrand(brand)}`;
    return `${decimal(value, theDecimals(brand))} ${b}`;
  };
  const showRatio = ({ numerator, denominator }) =>
    numerator.brand === denominator.brand
      ? `${numerator.value} / ${denominator.value}`
      : `${showAmount(numerator)} / ${showAmount(denominator)}`;

  return { brand: showBrand, amount: showAmount, ratio: showRatio };
};
