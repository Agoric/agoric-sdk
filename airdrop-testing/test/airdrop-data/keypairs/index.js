import KEY_STORE_ONE from './one-thousand.js';
import KEY_STORE_TWO from './twenty.js';

const ACCOUNT_DATA = {
  ONE_THOUSAND_MNEMONICS: KEY_STORE_ONE.map(({ mnemonic }) => mnemonic),
  TWENTY_MNEMONICS: KEY_STORE_TWO.map(({ mnemonic }) => mnemonic),
};
const { ONE_THOUSAND_MNEMONICS, TWENTY_MNEMONICS } = ACCOUNT_DATA;
const uncurry =
  fn =>
  (...args) =>
    args.reduce((fn, arg) => fn(arg), fn);

const mergeArrays =
  (x = []) =>
  (y = []) => [...x, ...y];
const mergeArraysAlt = uncurry(mergeArrays);

export { ONE_THOUSAND_MNEMONICS, TWENTY_MNEMONICS };

export default mergeArraysAlt(ONE_THOUSAND_MNEMONICS, TWENTY_MNEMONICS);
