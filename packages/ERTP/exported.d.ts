/* eslint-disable -- doesn't understand .d.ts */
/**
 * @file re-export types into global namespace, for consumers that expect these
 *   to be ambient
 */

// export everything
export * from './src/types.js';

// XXX re-export types into global namespace, for consumers that expect these to
//  be ambient
import {
  Amount as _Amount,
  Brand as _Brand,
  Issuer as _Issuer,
  IssuerKit as _IssuerKit,
  Mint as _Mint,
  AssetKind as _AssetKind,
  SetValue as _SetValue,
  NatValue as _NatValue,
  DisplayInfo as _DisplayInfo,
  AdditionalDisplayInfo as _AdditionalDisplayInfo,
  Payment as _Payment,
  Purse as _Purse,
} from './src/types.js';
declare global {
  export {
    _Amount as Amount,
    _Brand as Brand,
    _Issuer as Issuer,
    _IssuerKit as IssuerKit,
    _Mint as Mint,
    _AssetKind as AssetKind,
    _SetValue as SetValue,
    _NatValue as NatValue,
    _DisplayInfo as DisplayInfo,
    _AdditionalDisplayInfo as AdditionalDisplayInfo,
    _Payment as Payment,
    _Purse as Purse,
  };
}
