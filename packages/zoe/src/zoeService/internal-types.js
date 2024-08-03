// @jessie-check

/**
 * Create a purse for a new issuer
 *
 * @callback CreatePurse
 * @param {Issuer} issuer
 * @param {Brand} brand
 * @returns {ERef<void>}
 */

/**
 * Create a purse for a new, local issuer. Used only for ZCFMint issuers.
 *
 * Note: in the case of the feeMint, it may have been registered
 * before with `feeMintAccess`. In that case, we do not create a new
 * purse, but reuse the existing purse.
 *
 * @callback ProvideLocalPurse
 * @param {Issuer} issuer
 * @param {Brand} brand
 * @returns {Purse}
 */

/**
 * Deposits payments or promises for payments according to the
 * `give` property of the proposal. Using the proposal, creates an
 * initial allocation including the amount deposited for `give`
 * keywords and an empty amount for `want` keywords.
 *
 * @callback DepositPayments
 * @param {ProposalRecord} proposal
 * @param {PaymentPKeywordRecord} payments
 * @returns {Promise<Allocation>}
 */

/**
 * @callback InitInstanceAdmin
 * @param {Instance} instance
 * @param {InstanceAdmin} InstanceAdmin
 * @returns {void}
 */

/**
 * @callback GetInstanceAdmin
 * @param {Instance} instance
 * @returns {InstanceAdmin}
 */

/**
 * @callback DeleteInstanceAdmin
 * @param {Instance} instance
 * @returns {void}
 */

/**
 * @callback UnwrapInstallation
 *
 * Assert the installation is known, and return the bundle/bundlecap and
 * installation
 *
 * @param {ERef<Installation>} installationP
 * @returns {ERef<{
 *   bundle?: SourceBundle,
 *   bundleCap?: BundleCap,
 *   bundleID?: BundleID,
 *   installation:Installation
 * }>} XXX not really an ERef; the implemention is sync and the API is a promise because of callWhen
 */
// TODO remove or automate ERef https://github.com/Agoric/agoric-sdk/issues/7110

/**
 * @callback GetIssuerRecords
 * @returns {IssuerRecords}
 */

/**
 * @typedef {object} ZoeInstanceStorageManager
 * @property {() => AnyTerms} getTerms
 * @property {() => IssuerKeywordRecord} getIssuers
 * @property {() => BrandKeywordRecord} getBrands
 * @property {ZCF['saveIssuer']} saveIssuer
 * @property {MakeZoeMint} makeZoeMint
 * @property {RegisterFeeMint} registerFeeMint
 * @property {() => InstanceRecord} getInstanceRecord
 * @property {GetIssuerRecords} getIssuerRecords
 * @property {InitInstanceAdmin} initInstanceAdmin
 * @property {DeleteInstanceAdmin} deleteInstanceAdmin
 * @property {ZoeInstanceAdminMakeInvitation} makeInvitation
 * @property {() => Issuer} getInvitationIssuer
 * @property {() => object} getRoot of CreateVatResults
 * @property {() => import('@agoric/swingset-vat').VatAdminFacet} getAdminNode of CreateVatResults
 */

/**
 * Create a storage manager for a particular contract instance. The
 * ZoeInstanceStorageManager encapsulates access to the
 * issuerStorage and escrowStorage from Zoe, and stores the
 * instance-specific terms
 *
 * @callback MakeZoeInstanceStorageManager
 * @param {Installation} installation
 * @param {object} customTerms
 * @param {IssuerKeywordRecord} uncleanIssuerKeywordRecord
 * @param {Instance} instance
 * @param {BundleCap} contractBundleCap
 * @param {string} instanceLabel
 * @returns {Promise<ZoeInstanceStorageManager>}
 */

/**
 * @callback GetBundleCapForID
 * @param {BundleID} id
 * @returns {Promise<BundleCap>}
 */

/**
 * @callback GetProposalShapeForInvitation
 * @param {InvitationHandle} invitationHandle
 * @returns {Pattern | undefined}
 */

/**
 * @typedef ZoeStorageManager
 * @property {MakeZoeInstanceStorageManager} makeZoeInstanceStorageManager
 * @property {GetAssetKindByBrand} getAssetKindByBrand
 * @property {DepositPayments} depositPayments
 * @property {Issuer<'set'>} invitationIssuer
 * @property {InstallBundle} installBundle
 * @property {InstallBundleID} installBundleID
 * @property {GetBundleIDFromInstallation} getBundleIDFromInstallation
 * @property {import('./utils.js').GetPublicFacet} getPublicFacet
 * @property {GetBrands} getBrands
 * @property {GetIssuers} getIssuers
 * @property {import('./utils.js').GetTerms} getTerms
 * @property {GetOfferFilter} getOfferFilter
 * @property {SetOfferFilter} setOfferFilter
 * @property {GetInstallationForInstance} getInstallationForInstance
 * @property {GetInstanceAdmin} getInstanceAdmin
 * @property {UnwrapInstallation} unwrapInstallation
 * @property {GetProposalShapeForInvitation} getProposalShapeForInvitation
 */

/**
 * Use VatAdminSvc to create a new vat, but only with the code of the
 * ZCF bundle
 *
 * @callback CreateZCFVat
 * @param {BundleCap} contractBundleCap
 * @param {string} contractLabel
 * @returns {Promise<import('@agoric/swingset-vat').CreateVatResults>}
 */

/**
 * @callback GetFeeIssuerKit
 * @param {FeeMintAccess} feeMintAccess
 * @returns {IssuerKit<'nat'>}
 */
