import type { Brand, Issuer } from '@agoric/ertp';
import type { RemotableObject } from '@endo/pass-style';

/**
 * Alias for RemotableObject
 */
export type Handle<H extends string> = RemotableObject<H>;

// Typing this as Capitalize<string> would be more accurate but requires
// frequent casting. Revisit once .ts syntax is more common. Even then,
// may not be worth the effort since Zoe 2 probably will not have keywords.
/** Must start with a capital letter. */
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
