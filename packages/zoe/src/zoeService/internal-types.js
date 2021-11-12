// @ts-check

/**
 * Create a purse for a new issuer
 *
 * @callback CreatePurse
 * @param {Issuer} issuer
 * @param {Brand} brand
 * @returns {Promise<void>}
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
 * Assert the installation is known, and return the bundle and
 * installation
 *
 * @param {ERef<Installation>} installationP
 * @returns {Promise<{
 *   bundle: SourceBundle,
 *   installation:Installation
 * }>}
 */

/**
 * @callback GetIssuerRecords
 * @returns {IssuerRecords}
 */

/**
 * @typedef {Object} ZoeInstanceStorageManager
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
 * @property {Object} root of a RootAndAdminNode
 * @property {AdminNode} adminNode of a RootAndAdminNode
 */

/**
 * Create a storage manager for a particular contract instance. The
 * ZoeInstanceStorageManager encapsulates access to the
 * issuerStorage and escrowStorage from Zoe, and stores the
 * instance-specific terms
 *
 * @callback MakeZoeInstanceStorageManager
 * @param {Installation} installation
 * @param {Object} customTerms
 * @param {IssuerKeywordRecord} uncleanIssuerKeywordRecord
 * @param {Instance} instance
 * @param {ERef<FeePurse>} feePurse
 * @returns {ZoeInstanceStorageManager}
 */

/**
 * @typedef ZoeStorageManager
 * @property {MakeZoeInstanceStorageManager} makeZoeInstanceStorageManager
 * @property {GetAssetKindByBrand} getAssetKindByBrand
 * @property {DepositPayments} depositPayments
 * @property {Issuer} invitationIssuer
 * @property {Install} install
 * @property {GetPublicFacet} getPublicFacet
 * @property {GetBrands} getBrands
 * @property {GetIssuers} getIssuers
 * @property {GetTerms} getTerms
 * @property {GetInstallationForInstance} getInstallationForInstance
 * @property {GetInstanceAdmin} getInstanceAdmin
 * @property {UnwrapInstallation} unwrapInstallation
 */

/**
 * Use VatAdminSvc to create a new vat, but only with the code of the
 * ZCF bundle
 *
 * @callback CreateZCFVat
 * @returns {Promise<RootAndAdminNodeAndMeter>}
 */

/**
 * @typedef {Handle<'feeMintAccess'>} FeeMintAccess
 */

/**
 * @callback GetFeeIssuerKit
 * @param {FeeMintAccess} feeMintAccess
 * @returns {IssuerKit}
 */

/**
 * @callback ChargeZoeFee
 * @param {ERef<Purse>} feePurse
 * @param {Amount} feeAmount
 * @returns {Promise<void>}
 */

/**
 * @typedef {bigint} Computrons
 */

/**
 * @typedef {Object} Meter
 *
 * All `bigint` units here are in computrons.
 *
 * @property {(delta: Computrons) => void} addRemaining
 * @property {(newThreshold: Computrons) => void} setThreshold
 * @property {() => Computrons} get
 * @property {() => Notifier<Computrons>} getNotifier
 */

/**
 * @callback ChargeForComputrons
 *
 * Charges the feePurse argument for a set number of computrons (This
 * number is returned by the function and can now be added to the
 * meter).
 *
 * @param {ERef<FeePurse>} feePurse
 * @returns {Promise<bigint>}
 */

/**
 * @callback TranslateFee
 * @param {FeeChoice | undefined} relativeFee
 * @returns {Amount | undefined}
 */

/**
 * @callback TranslateExpiry
 * @param {ExpiryChoice | undefined} relativeExpiry
 * @returns {Timestamp | undefined}
 */
