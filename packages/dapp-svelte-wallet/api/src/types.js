/**
 * @template T
 * @typedef {import('@agoric/promise-kit').ERef<T>} ERef
 */

/**
 * @typedef {import('@agoric/cosmic-swingset/lib/ag-solo/vats/lib-board').Board} Board
 */

/**
 * @typedef {string | string[]} Petname
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
 * @typedef {Object} WalletBridge The wallet methods available within the
 * context of a Dapp.
 * @property {(offer: OfferState) => Promise<void>} addOffer
 * @property {(brandBoardId: string) => Promise<string>} getDepositFacetId
 * @property {() => Promise<Notifier<Array<[string, PursesJSONState]>>>}
 * getPursesNotifier
 * @property {() => Promise<Notifier<Array<[string, OfferJSONState]>>>}
 * getOfferNotifier
 * @property {(petname: Petname, issuerBoardId: string) => Promise<void>}
 * suggestIssuer
 * @property {(petname: Petname, installationBoardId: string) => Promise<void>}
 * suggestInstallation
 * @property {(petname: Petname, instanceBoardId: string) => Promise<void>}
 * suggestInstance
 */

/**
 * @typedef {Object} WalletTodo
 * @property {(offer: OfferState, invitation: ERef<Payment>) => Promise<string>}
 * addOfferInvitation add an invitation to the specified offer
 */

/**
 * @typedef {Object} WalletUser the presence exposed as `local.wallet` (or
 * `home.wallet`)
 * @property {() => Promise<WalletBridge>} getAnonymousBridge return the wallet
 * bridge not bound to a given Dapp
 * @property {() => Promise<any>} getInternals return the specialized backend
 * for the wallet UI frontend
 * @property {(brandBoardId: string) => Promise<string>} getDepositFacetId
 * @property {() => Promise<Array<[Petname, Issuer]>>} getIssuers
 * @property {(petname: Petname) => Issuer} getIssuer
 * @property {() => Promise<Array<[Petname, Purse]>>} getPurses
 * @property {(petname: Petname) => Purse} getPurse
 * @property {(payment: ERef<Payment>) => Promise<void>} addPayment
 */
