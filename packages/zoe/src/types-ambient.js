// @jessie-check

/// <reference types="ses"/>

/**
 * @template {string} H - the name of the handle
 * @typedef {import("@endo/marshal").RemotableObject<H>} Handle Alias for RemotableObject
 */

/**
 * @typedef {string} Keyword
 * @typedef {Handle<'Invitation'>} InvitationHandle - an opaque handle for an invitation
 * @typedef {Record<Keyword, Issuer<any>>} IssuerKeywordRecord
 * @typedef {Record<Keyword, ERef<Issuer<any>>>} IssuerPKeywordRecord
 * @typedef {Record<Keyword, Brand<any>>} BrandKeywordRecord
 */

/**
 * @typedef {object} StandardTerms
 * @property {IssuerKeywordRecord} issuers - record with
 * keywords keys, issuer values
 * @property {BrandKeywordRecord} brands - record with keywords
 * keys, brand values
 *
 * @typedef {StandardTerms & Record<string, any>} AnyTerms
 *
 * @typedef {object} InstanceRecord
 * @property {Installation} installation
 * @property {import("./zoeService/utils.js").Instance<any>} instance
 * @property {AnyTerms} terms - contract parameters
 */

/**
 * @template {AssetKind} [K=AssetKind]
 * @template {import("@endo/patterns").Key} [M=import("@endo/patterns").Key] member kind, for Amounts that have member values
 * @typedef {object} IssuerRecord
 * @property {Brand<K>} brand
 * @property {Issuer<K, M>} issuer
 * @property {K} assetKind
 * @property {DisplayInfo<K>} [displayInfo]
 *
 * @typedef {AmountKeywordRecord} Allocation
 */
