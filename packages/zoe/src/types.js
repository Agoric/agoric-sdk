// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

/**
 * @template {string} H - the name of the handle
 * @typedef {H & {}} Handle A type constructor for an opaque type
 * identified by the H string. This uses an intersection type
 * ('MyHandle' & {}) to tag the handle's type even though the actual
 * value is just an empty object.
 */

/**
 * @typedef {string} Keyword
 * @typedef {Handle<'Invitation'>} InvitationHandle - an opaque handle for an invitation
 * @typedef {Record<Keyword,Issuer>} IssuerKeywordRecord
 * @typedef {Record<Keyword,Brand>} BrandKeywordRecord
 * @typedef {Record<Keyword, DeprecatedAmountMath>} DeprecatedAmountMathKeywordRecord
 */

/**
 * @typedef {Object} StandardTerms
 * @property {IssuerKeywordRecord} issuers - record with
 * keywords keys, issuer values
 * @property {BrandKeywordRecord} brands - record with keywords
 * keys, brand values
 * @property {DeprecatedAmountMathKeywordRecord} maths - record with keywords
 * keys, amountMath values
 *
 * @typedef {StandardTerms & Record<string, any>} Terms
 *
 * @typedef {object} InstanceRecord
 * @property {Installation} installation
 * @property {Terms} terms - contract parameters
 
 *
 * @typedef {Object} IssuerRecord
 * @property {Brand} brand
 * @property {Issuer} issuer
 * @property {DeprecatedAmountMath} amountMath
 * @property {AmountMathKind} mathKind
 * @property {any} [displayInfo]
 *
 * @typedef {AmountKeywordRecord} Allocation
 * @typedef {Record<Keyword,AmountMath>} AmountMathKeywordRecord
 */

/**
 * @typedef {Payment} Invitation
 */
