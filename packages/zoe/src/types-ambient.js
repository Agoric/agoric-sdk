// @jessie-check

/// <reference types="ses"/>

/**
 * @template {string} H - the name of the handle
 * @typedef {H & import("@endo/marshal").Remotable} Handle A type constructor for an opaque type
 * identified by the H string. This uses an intersection type
 * ('MyHandle' & {}) to tag the handle's type even though the actual
 * value is just an empty object.
 */

/**
 * @typedef {string} Keyword
 * @typedef {Handle<'Invitation'>} InvitationHandle - an opaque handle for an invitation
 */

/**
 * @template {Record<Keyword, AssetKind>} [IKR=Record<Keyword, AssetKind>]
 * @typedef {{ [K in keyof IKR]: Issuer<IKR[K]> }} IssuerKeywordRecord
 */

/**
 * @template {Record<Keyword, AssetKind>} [IKR=Record<Keyword, AssetKind>]
 * @typedef {{ [K in keyof IKR]: Brand<IKR[K]> }} BrandKeywordRecord
 */

/**
 * @template {Record<Keyword, AssetKind>} [IKR=Record<Keyword, AssetKind>]
 * @typedef {{ [K in keyof IKR]: ERef<Issuer<IKR[K]>> }} IssuerPKeywordRecord
 */

/**
 * @template {Record<Keyword, AssetKind>} [IKR=Record<Keyword, AssetKind>]
 * @typedef {object} StandardTerms
 * @property {IssuerKeywordRecord<IKR>} issuers - record with
 * keywords keys, issuer values
 * @property {BrandKeywordRecord<IKR>} brands - record with keywords
 * keys, brand values
 *
 * @typedef {object} InstanceRecord
 * @property {Installation} installation
 * @property {import("./zoeService/utils.js").Instance<any>} instance
 * @property {AnyTerms} terms - contract parameters
 */

/**
 * @template {Record<Keyword, AssetKind>} [IKR=Record<Keyword, AssetKind>]
 * @typedef {StandardTerms<IKR> & Record<Keyword, any>} AnyTerms
 */

/**
 * @template {AssetKind} [K=AssetKind]
 * @typedef {object} IssuerRecord
 * @property {Brand<K>} brand
 * @property {Issuer<K>} issuer
 * @property {K} assetKind
 * @property {DisplayInfo<K>} [displayInfo]
 *
 * @typedef {AmountKeywordRecord} Allocation
 */
