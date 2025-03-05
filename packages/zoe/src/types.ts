import type {
  Issuer,
  Brand,
  AssetKind,
  DisplayInfo,
  AnyAmount,
} from '@agoric/ertp';
import type { RemotableObject } from '@endo/pass-style';
import type { Key } from '@endo/patterns';

/**
 * Alias for RemotableObject
 */
export type Handle<H extends string> = RemotableObject<H>;
export type Keyword = string;
/**
 * - an opaque handle for an invitation
 */
export type InvitationHandle = Handle<'Invitation'>;
export type IssuerKeywordRecord = Record<Keyword, Issuer<any>>;
export type IssuerPKeywordRecord = Record<
  Keyword,
  import('@endo/far').ERef<Issuer<any>>
>;
export type BrandKeywordRecord = Record<Keyword, Brand<any>>;
export type StandardTerms = {
  /**
   * - record with
   * keywords keys, issuer values
   */
  issuers: IssuerKeywordRecord;
  /**
   * - record with keywords
   * keys, brand values
   */
  brands: BrandKeywordRecord;
};
export type AnyTerms = StandardTerms & Record<string, any>;
export type InstanceRecord = {
  installation: import('./zoeService/utils.js').Installation<any>;
  instance: import('./zoeService/utils.js').Instance<any>;
  /**
   * - contract parameters
   */
  terms: AnyTerms;
};

// TODO this is a copy of the type from '@agoric/ertp'
export type IssuerRecord<
  K extends AssetKind = AssetKind,
  M extends Key = Key,
> = {
  brand: Brand<K>;
  issuer: Issuer<K, M>;
  assetKind: K;
  displayInfo?: DisplayInfo<K>;
};
export type Allocation = Record<Keyword, AnyAmount>;
