//@ts-nocheck
/** buf:lint:ignore ENUM_VALUE_PREFIX */
export enum Algorithm {
  /** UNSPECIFIED - buf:lint:ignore ENUM_ZERO_VALUE_SUFFIX */
  UNSPECIFIED = 0,
  STABLESWAP = 1,
  PERFECTPRICE = 2,
  UNRECOGNIZED = -1,
}
export const AlgorithmSDKType = Algorithm;
export function algorithmFromJSON(object: any): Algorithm {
  switch (object) {
    case 0:
    case 'UNSPECIFIED':
      return Algorithm.UNSPECIFIED;
    case 1:
    case 'STABLESWAP':
      return Algorithm.STABLESWAP;
    case 2:
    case 'PERFECTPRICE':
      return Algorithm.PERFECTPRICE;
    case -1:
    case 'UNRECOGNIZED':
    default:
      return Algorithm.UNRECOGNIZED;
  }
}
export function algorithmToJSON(object: Algorithm): string {
  switch (object) {
    case Algorithm.UNSPECIFIED:
      return 'UNSPECIFIED';
    case Algorithm.STABLESWAP:
      return 'STABLESWAP';
    case Algorithm.PERFECTPRICE:
      return 'PERFECTPRICE';
    case Algorithm.UNRECOGNIZED:
    default:
      return 'UNRECOGNIZED';
  }
}
