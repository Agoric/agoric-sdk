/**
 * @callback InstallSaveAndPublish
 * @param {string} resolvedPath
 * @param {Petname} contractPetname
 * @returns {{ installation: Installation, id: string}}
 */

/**
 * @callback ResolvePathForLocalContract
 * @param {string} contractPath
 * @returns {string}
 */

/**
 * @callback ResolvePathForPackagedContract
 * @param {string} contractPath
 * @returns {string}
 */

/**
 * @callback SaveLocalAmountMaths
 * @param {Array<Petname>} petnames
 * @returns {Promise<void[]>}
 */

/**
 * @callback GetLocalAmountMath
 * @param {Petname} petname
 * @returns {DeprecatedAmountMath}
 */

/**
 * @typedef {Object} StartInstanceAndSaveConfig
 * @property {Petname} instancePetname
 * @property {ERef<Installation>} installation
 * @property {IssuerKeywordRecord=} issuerKeywordRecord
 * @property {Record<Keyword,Petname>=} issuerPetnameKeywordRecord
 * @property {Object=} terms
 */

/**
 * @typedef {Object} StartInstanceResultWithDetailsNoInvitation
 * @property {any} creatorFacet
 * @property {any} publicFacet
 * @property {Instance} instance
 * @property {InvitationDetails} creatorInvitationDetails
 * @property {AdminFacet} adminFacet
 */

/**
 * @callback StartInstanceAndSave
 * @param {StartInstanceAndSaveConfig} config
 * @returns {StartInstanceResult | StartInstanceResultWithDetailsNoInvitation}
 */

/**
 * @typedef {Partial<ProposalRecordWithBrandPetnames>} ProposalWithBrandPetnames
 *
 * @typedef {{give: Record<Keyword, { brand: Petname, value: any}>,
 *            want: Record<Keyword, { brand: Petname, value: any}>,
 *            exit: ExitRule
 *           }} ProposalRecordWithBrandPetnames
 */

/**
 * @typedef {Object} OfferHelperConfig
 * @property {ERef<Invitation>=} invitation
 * @property {Partial<InvitationDetails>=} partialInvitationDetails
 * @property {ProposalWithBrandPetnames} proposalWithBrandPetnames
 * @property {Record<Keyword, Petname>} paymentsWithPursePetnames
 * @property {Record<Keyword, Petname>} payoutPursePetnames
 */

/**
 * @callback OfferHelper
 * @param {OfferHelperConfig} config
 * @returns {{seat: Promise<UserSeat>, deposited:
 * Promise<Array<Promise<Amount>>>, invitationDetails:
 * InvitationDetails}}
 */

/**
 * @callback FindInvitationAmount
 * @param {Record<string, any>} invitationDetailsCriteria
 * @returns {Amount} invitationAmount
 */

/**
 * @callback DepositInvitation
 * @param {ERef<Invitation>} invitationP
 * @returns {InvitationDetails}
 */

/**
 * @callback SaveIssuerHelper
 * @param {ERef<Issuer>} issuer
 * @param {Petname} brandPetname
 * @param {Petname} pursePetname
 * @returns {Promise<Array<Promise>}
 */

/**
 * @callback AssertOfferResult
 * @param {ERef<UserSeat>} seat
 * @param {string} expectedOfferResult
 * @returns {Promise<void>}
 */

/**
 * @typedef {string | string[]} Petname A petname can either be a plain string
 * or a path for which the first element is a petname for the origin, and the
 * rest of the elements are a snapshot of the names that were first given by that
 * origin.  We are migrating away from using plain strings, for consistency.
 */
