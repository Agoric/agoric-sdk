// @ts-check

/**
 * This is the complete wallet, including the means to get the WalletAdminFacet
 * (necessary for the operation of the Wallet UI, and useful for the REPL).
 *
 * @typedef {WalletUser & { getAdminFacet: () => WalletAdminFacet, getMarshaller: () => Marshaller }} WalletAdmin
 */

/**
 * @typedef {object} WalletUser
 * The presence exposed as `local.wallet` (or
 * `home.wallet`).  The idea is to provide someplace from which all the rest of
 * the API can be obtained.
 *
 * NOTE: We are still extending this API with standardized functionality from
 * the evolving WalletAdminFacet (in internal-types.js).  See
 * https://github.com/Agoric/agoric-sdk/issues/2042 for details.
 *
 * @property {() => Promise<WalletBridge>} getBridge
 * Return the wallet bridge
 * that bypasses Dapp-authorization.  This should only be used within the REPL
 * or deployment scripts that want to use the WalletBridge API without the
 * effort of calling `getScopedBridge`.
 *
 * @property {(suggestedDappPetname: Petname,
 *             dappOrigin: string
 * ) => Promise<WalletBridge>} getScopedBridge
 * Return a wallet bridge corresponding
 * to an origin that must be approved in the wallet UI.  This is available for
 * completeness in order to provide the underlying API that's available over the
 * standard wallet-bridge.html.
 *
 * @property {(payment: ERef<Payment>) => Promise<void>} addPayment
 * Add a payment of any brand to the wallet for deposit to the user-specified
 * purse (either an autodeposit or manually approved).
 *
 * @property {(brandBoardId: string) => Promise<string>} getDepositFacetId
 * Return the board ID to use to receive payments of the specified brand (used
 * by existing deploy scripts).
 * @property {() => Array<[Petname, Issuer]>} getIssuers
 * Get all the issuers (used by existing deploy scripts).
 * @property {(petname: Petname) => Issuer} getIssuer
 * Get an issuer by petname (used by existing deploy scripts).
 * @property {() => Array<[Petname, Purse]>} getPurses
 * Get all the purses (used by existing deploy scripts).
 * @property {(petname: Petname) => Purse} getPurse
 * Get a purse by petname (used by existing deploy scripts).
 * @property {() => Marshaller} getMarshaller
 */

/**
 * @typedef {object} WalletBridge
 * The methods that can be used by an untrusted
 * Dapp without breaching the wallet's integrity.  These methods are also
 * exposed via the iframe/WebSocket bridge that a Dapp UI can use to access the
 * wallet.
 *
 * @property {(offer: OfferState) => Promise<string>} addOffer
 * @property {() => Promise<import('@agoric/cache').Coordinator>} getCacheCoordinator
 * @property {(brandBoardId: string) => Promise<string>} getDepositFacetId
 * Return the board ID to use to receive payments of the specified brand.
 * @property {() => Promise<Notifier<Array<PursesJSONState>>>} getPursesNotifier
 * Follow changes to the purses.
 * @property {(
 * ) => Promise<Notifier<Array<[Petname, BrandRecord]>>>} getIssuersNotifier
 * Follow changes to the issuers
 * @property {() => Promise<Notifier<Array<OfferState>>>} getOffersNotifier
 * Follow changes to the offers.
 * @property {(petname: Petname,
 *             issuerBoardId: string
 * ) => Promise<void>} suggestIssuer
 * Introduce an ERTP issuer to the wallet, with a suggested petname.
 * @property {(petname: Petname,
 *             installationBoardId: string
 * ) => Promise<void>} suggestInstallation
 * Introduce a Zoe contract installation to the wallet, with suggested petname.
 * @property {(petname: Petname,
 *             instanceBoardId: string
 * ) => Promise<void>} suggestInstance
 * Introduce a Zoe contract instance to the wallet, with suggested petname.
 * @property {(rawId: string) => Promise<Notifier<any>>} getUINotifier
 * Get the UI notifier from the offerResult for a particular offer,
 * identified by id. This notifier should only contain information that
 * is safe to pass to the dapp UI.
 * @property {() => Promise<ZoeService>} getZoe
 * Get the Zoe Service
 * @property {() => Promise<import('@agoric/vats').Board>} getBoard
 * Get the Board
 * @property {(...path: Array<unknown>) => Promise<unknown>} getAgoricNames
 * Get the curated Agoric public naming hub
 * @property {(...path: Array<unknown>) => Promise<unknown>} getNamesByAddress
 * Get the Agoric address mapped to its public naming hub
 * @property {(brands: Array<Brand>
 * ) => Promise<Array<Petname>>} getBrandPetnames
 * Get the petnames for the brands that are passed in
 */

/**
 * @typedef {object} RecordMetadata
 * @property {number} id
 * Identifies a particular record in the context of the wallet backend. This id
 * is stable and unique for a wallet backend (even across different record
 * types).
 * @property {number} [creationStamp]
 * The approximate time at which the record
 * was created in milliseconds since the epoch; `undefined` if there is no
 * timer source
 * @property {number} [updatedStamp]
 * The approximate time at which the record
 * was last updated in milliseconds since the epoch; `undefined` if there is
 * no timer source
 */

/**
 * @typedef {object} PursesJSONState
 * @property {Brand} brand
 * @property {string} brandBoardId
 * The board ID for this purse's brand
 * @property {string} [depositBoardId]
 * The board ID for the deposit-only facet of this purse
 * @property {Petname} brandPetname
 * The petname for this purse's brand
 * @property {Petname} pursePetname
 * The petname for this purse
 * @property {any} displayInfo
 * The brand's displayInfo
 * @property {any} value
 * The purse's current balance
 * @property {any} currentAmountSlots
 * @property {any} currentAmount
 */

/**
 * @typedef {object} OfferState
 * @property {any} requestContext
 * @property {string} id
 */

/**
 * @template T
 * @typedef {object} PetnameManager
 * @property {(petname: Petname, object: T) => Promise<void>} rename
 * @property {(petname: Petname) => T} get
 * @property { () => Array<[Petname, T]>} getAll
 * @property {(petname: Petname, object: T) => Promise<void>} add
 */

/**
 * @typedef {PetnameManager<Installation>} InstallationManager
 */

/**
 * @typedef {PetnameManager<Instance>} InstanceManager
 */

/**
 * @typedef {PetnameManager<Issuer>} IssuerManager
 */

/**
 * @typedef {object} IssuerTable
 * @property {(brand: Brand) => boolean} hasByBrand
 * @property {(brand: Brand) => IssuerRecord} getByBrand
 * @property {(issuer: Issuer) => boolean} hasByIssuer
 * @property {(issuer: Issuer) => IssuerRecord} getByIssuer
 * @property {(issuerP: ERef<Issuer>,
 *             addMeta?: (x: any) => any
 * ) => Promise<IssuerRecord>} initIssuer
 * @property {(issuerRecord: IssuerRecord) => void } initIssuerByRecord
 */
