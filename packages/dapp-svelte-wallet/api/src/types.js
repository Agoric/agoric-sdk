/**
 * @template T
 * @typedef {import('@agoric/promise-kit').ERef<T>} ERef
 */

/**
 * @typedef {string | string[]} Petname A petname can either be a plain string
 * or a path for which the first element is a petname for the origin, and the
 * rest of the elements are a snapshot of the names that were first given by that
 * origin.  We are migrating away from using plain strings, for consistency.
 */

/**
 * @typedef {Object} WalletUser the presence exposed as `local.wallet` (or
 * `home.wallet`).  The idea is to provide someplace from which all the rest of
 * the API can be obtained.
 *
 * NOTE: We are still extending this API with standardized functionality from
 * the evolving WalletAdminFacet (in internal-types.js).  See
 * https://github.com/Agoric/agoric-sdk/issues/2042 for details.
 *
 * @property {() => Promise<WalletBridge>} getBridge return the wallet bridge
 * that bypasses Dapp-authorization.  This should only be used within the REPL
 * or deployment scripts that want to use the WalletBridge API without the
 * effort of calling `getScopedBridge`.
 *
 * @property {(suggestedDappPetname: Petname, dappOrigin: string) =>
 * Promise<WalletBridge>} getScopedBridge return a wallet bridge corresponding
 * to an origin that must be approved in the wallet UI.  This is available for
 * completeness in order to provide the underlying API that's available over the
 * standard wallet-bridge.html.
 *
 * @property {(payment: ERef<Payment>) => Promise<void>} addPayment add a
 * payment of any brand to the wallet for deposit to the user-specified purse
 * (either an autodeposit or manually approved).
 *
 * @property {(brandBoardId: string) => Promise<string>} getDepositFacetId
 * return the board ID to use to receive payments of the specified brand (used
 * by existing deploy scripts).
 * @property {() => Array<[Petname, Issuer]>} getIssuers get all the issuers
 * (used by existing deploy scripts).
 * @property {(petname: Petname) => Issuer} getIssuer get an issuer by petname
 * (used by existing deploy scripts).
 * @property {() => Array<[Petname, Purse]>} getPurses get all the purses (used
 * by existing deploy scripts).
 * @property {(petname: Petname) => Purse} getPurse get a purse by petname (used
 * by existing deploy scripts).
 */

/**
 * @typedef {Object} WalletBridge The methods that can be used by an untrusted
 * Dapp without breaching the wallet's integrity.  These methods are also
 * exposed via the iframe/WebSocket bridge that a Dapp UI can use to access the
 * wallet.
 *
 * @property {(offer: OfferState) => Promise<string>} addOffer
 * @property {(offer: OfferState, invitation: ERef<Payment>) => Promise<string>}
 * addOfferInvitation add an invitation to the specified offer
 * @property {(brandBoardId: string) => Promise<string>} getDepositFacetId
 * return the board ID to use to receive payments of the specified brand.
 * @property {() => Promise<Notifier<Array<PursesJSONState>>>} getPursesNotifier
 * Follow changes to the purses.
 * @property {() => Promise<Notifier<Array<[Petname, BrandRecord]>>>} getIssuersNotifier
 * Follow changes to the issuers
 * @property {() => Promise<Notifier<Array<OfferState>>>} getOffersNotifier
 * Follow changes to the offers.
 * @property {(petname: Petname, issuerBoardId: string) => Promise<void>}
 * suggestIssuer Introduce an ERTP issuer to the wallet, with a suggested
 * petname.
 * @property {(petname: Petname, installationBoardId: string) => Promise<void>}
 * suggestInstallation Introduce a Zoe contract installation to the wallet, with
 * suggested petname.
 * @property {(petname: Petname, instanceBoardId: string) => Promise<void>}
 * suggestInstance Introduce a Zoe contract instance to the wallet, with
 * suggested petname.
 * @property {(rawId: string) => Promise<Notifier<any>>} getUINotifier
 * Get the UI notifier from the offerResult for a particular offer,
 * identified by id. This notifier should only contain information that
 * is safe to pass to the dapp UI.
 * @property {() => Promise<ZoeService>} getZoe
 * Get the Zoe Service
 * @property {() => Promise<Board>} getBoard
 * Get the Board
 * @property {(...path: Array<unknown>) => Promise<unknown>} getAgoricNames
 * Get the curated Agoric public naming hub
 * @property {(...path: Array<unknown>) => Promise<unknown>} getNamesByAddress
 * Get the Agoric address mapped to its public naming hub
 * @property {(brands: Array<Brand>) => Promise<Array<Petname>>}
 * getBrandPetnames
 * Get the petnames for the brands that are passed in
 */

/**
 * @typedef {Object} PursesJSONState
 * @property {Brand} brand
 * @property {string} brandBoardId  the board ID for this purse's brand
 * @property {string=} depositBoardId the board ID for the deposit-only facet of
 * this purse
 * @property {Petname} brandPetname the petname for this purse's brand
 * @property {Petname} pursePetname the petname for this purse
 * @property {any} displayInfo the brand's displayInfo
 * @property {any} value the purse's current balance
 * @property {any} currentAmountSlots
 * @property {any} currentAmount
 */

/**
 * @typedef {Object} OfferState
 * @property {any} requestContext
 * @property {string} id
 */

/**
 * @template T
 * @typedef {Object} PetnameManager
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
