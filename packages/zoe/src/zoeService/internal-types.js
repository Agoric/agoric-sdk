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
 * @callback MakeLocalPurse
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
 * @returns {Promise<{
 *   bundle?: SourceBundle,
 *   bundleCap?: BundleCap,
 *   bundleID?: BundleID,
 *   installation:Installation
 * }>}
 */

/**
 * @callback GetIssuerRecords
 * @returns {IssuerRecords}
 */

/**
 * @typedef {object} ZoeInstanceStorageManager
 * @property {InstanceRecordManagerGetTerms} getTerms
 * @property {InstanceRecordManagerGetInstallationForInstance} getInstallationForInstance
 * @property {InstanceRecordGetIssuers} getIssuers
 * @property {InstanceRecordGetBrands} getBrands
 * @property {SaveIssuer} saveIssuer
 * @property {MakeZoeMint} makeZoeMint
 * @property {RegisterFeeMint} registerFeeMint
 * @property {GetInstanceRecord} getInstanceRecord
 * @property {GetIssuerRecords} getIssuerRecords
 * @property {WithdrawPayments} withdrawPayments
 * @property {InitInstanceAdmin} initInstanceAdmin
 * @property {DeleteInstanceAdmin} deleteInstanceAdmin
 * @property {ZoeInstanceAdminMakeInvitation} makeInvitation
 * @property {Issuer} invitationIssuer
 * @property {object} root of a RootAndAdminNode
 * @property {AdminNode} adminNode of a RootAndAdminNode
 */

/**
 * Create a storage manager for a particular contract instance. The
 * ZoeInstanceStorageManager encapsulates access to the
 * issuerStorage and escrowStorage from Zoe, and stores the
 * instance-specific terms
 *
 * @callback MakeZoeInstanceStorageManager
 * @param {import('@agoric/vat-data').Baggage} instanceBaggage
 * @param {Installation} installation
 * @param {object} customTerms
 * @param {IssuerKeywordRecord} uncleanIssuerKeywordRecord
 * @param {Instance} instance
 * @param {BundleCap} contractBundleCap
 * @returns {ZoeInstanceStorageManager}
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
 * @property {GetTerms} getTerms
 * @property {GetOfferFilter} getOfferFilter
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
 * @returns {Promise<RootAndAdminNode>}
 */

/**
 * @callback GetFeeIssuerKit
 * @param {FeeMintAccess} feeMintAccess
 * @returns {IssuerKit<'nat'>}
 */
