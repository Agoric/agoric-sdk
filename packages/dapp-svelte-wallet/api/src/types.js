/**
 * @template T
 * @typedef {import('@agoric/promise-kit').ERef<T>} ERef
 */

/**
 * @typedef {import('@agoric/cosmic-swingset/lib/ag-solo/vats/lib-board').Board} Board
 */

/**
 * @typedef {string | string[]} Petname A petname can either be a plain string
 * or a path for which the first element (the edgename) is a petname.  We are
 * migrating away from using plain strings, for consistency.
 */

/**
 * @typedef {Object} WalletBridge The wallet methods available within the
 * context of a Dapp.
 * @property {(offer: OfferState) => Promise<string>} addOffer
 * @property {(offer: OfferState, invitation: ERef<Payment>) => Promise<string>}
 * addOfferInvitation add an invitation to the specified offer
 * @property {(brandBoardId: string) => Promise<string>} getDepositFacetId
 * @property {() => Promise<Notifier<Array<PursesFullState>>>}
 * getPursesNotifier
 * @property {() => Promise<Notifier<Array<OfferState>>>}
 * getOffersNotifier
 * @property {(petname: Petname, issuerBoardId: string) => Promise<void>}
 * suggestIssuer
 * @property {(petname: Petname, installationBoardId: string) => Promise<void>}
 * suggestInstallation
 * @property {(petname: Petname, instanceBoardId: string) => Promise<void>}
 * suggestInstance
 */

/**
 * @typedef {Object} WalletUser the presence exposed as `local.wallet` (or
 * `home.wallet`)
 * @property {(suggestedDappPetname: Petname, dappOrigin: string) =>
 * Promise<WalletBridge>} getBridge return a wallet bridge corresponding to an
 * origin that must be approved in the wallet UI
 * @property {() => Promise<WalletBridge>} getPreapprovedBridge return the
 * wallet bridge that bypasses Dapp-authorization
 * @property {(brandBoardId: string) => Promise<string>} getDepositFacetId
 * @property {() => Array<[Petname, Issuer]>} getIssuers
 * @property {(petname: Petname) => Issuer} getIssuer
 * @property {() => Array<[Petname, Purse]>} getPurses
 * @property {(petname: Petname) => Purse} getPurse
 * @property {(payment: ERef<Payment>) => Promise<void>} addPayment
 */

/**
 * @typedef {Object} PursesJSONState
 * @property {string} brandBoardId
 * @property {string=} depositBoardId
 * @property {Petname} brandPetname
 * @property {Petname} pursePetname
 * @property {any} displayInfo
 * @property {any} value
 * @property {any} currentAmountSlots
 * @property {any} currentAmount
 */

/**
 * @typedef {Object} OfferState
 * @property {any} requestContext
 * @property {string} id
 */
