export {
  isComparable,
  assertComparable,
  assertComparable as mustBeComparable, // deprecated
} from '@agoric/marshal';

export {
  sameValueZero,
  allComparable,
  sameKey,
  sameKey as sameStructure, // deprecated
} from './src/sameKey';

export { M, match } from './src/pattern';
