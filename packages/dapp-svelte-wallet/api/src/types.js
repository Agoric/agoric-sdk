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
 * @property {any} value
 * @property {any} currentAmountSlots
 * @property {any} currentAmount
 */
/**
 * @typedef {Object} PursesAddedState
 * @property {Purse} purse
 * @property {Brand} brand
 * @property {PurseActions} actions
 */

/**
 * @typedef {PursesJSONState & PursesAddedState} PursesFullState
 */

/**
 * @typedef {Object} PurseActions
 * @property {(receiverP: ERef<{ receive: (payment: Payment) => void }>, valueToSend: Value) => Promise<void>} send
 * @property {(payment: Payment) => Promise<Value>} receive
 * @property {(payment: Payment, amount: Amount=) => Promise<Value>} deposit
 */

/**
 * @typedef {Object} BrandRecord
 * @property {Brand} brand
 * @property {Issuer} issuer
 * @property {string} issuerBoardId
 * @property {AmountMath} amountMath
 */

/**
 * @typedef {Object} Contact
 * @property {string=} depositBoardId
 */

/**
 * @typedef {Object} DappRecord
 * @property {Promise<void>=} approvalP
 * @property {Petname} suggestedPetname
 * @property {Petname} petname
 * @property {boolean} enable
 * @property {string} origin
 * @property {DappActions} actions
 */

/**
 * @typedef {Object} DappActions
 * @property {(petname: Petname) => DappActions} setPetname
 * @property {() => DappActions} enable
 * @property {(reason: any) => DappActions} disable
 */

/**
 * @template T
 * @typedef {Object} Mapping
 * @property {(petname: Petname) => string} implode
 * @property {(str: string) => Petname} explode
 * @property {WeakStore<T, Petname>} valToPetname
 * @property {WeakStore<T, string[][]>} valToPaths
 * @property {Store<Petname, T>} petnameToVal
 * @property {(petname: Petname, val: T) => void} addPetname
 * @property {(path: string[], val: T) => void} addPath
 * @property {(petname: Petname, val: T) => void} renamePetname
 * @property {(petname: Petname) => void} deletePetname
 * @property {(petname: Petname, val: T) => void} suggestPetname
 * @property {string} kind
 */

/**
 * @typedef {Object} PaymentRecord
 * @property {Issuer=} issuer
 * @property {Payment} payment
 * @property {Brand} brand
 * @property {'pending'|'deposited'|undefined} status
 * @property {PaymentActions} actions
 * @property {Amount=} lastAmount
 * @property {Amount=} depositedAmount
 * @property {string=} issuerBoardId
 *
 * @typedef {Object} PaymentActions
 * @property {(purseOrPetname: (Purse | Petname)=) => Promise<Value>} deposit
 * @property {() => Promise<boolean>} refresh
 * @property {() => Promise<boolean>} getAmountOf
 */
