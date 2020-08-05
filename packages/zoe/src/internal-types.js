/**
 * @template K,V
 * @typedef {import('@agoric/store').Store<K, V>} Store
 */

/**
 * @template K,V
 * @typedef {import('@agoric/weak-store').WeakStore<K, V>} WeakStore
 */

/**
 * @template T
 * @typedef {import('@agoric/produce-promise').PromiseRecord<T>} PromiseRecord
 */

/**
 * @template T
 * @typedef {import('@agoric/notifier').Updater<T>} Updater
 */

/**
 * @template T
 * @typedef {import('@agoric/notifier').NotifierRecord<T>} NotifierRecord
 */

/**
 * @template T
 * @typedef {(record: any) => record is T} Validator
 */

/**
 * @template T
 * @typedef {Object} Table
 * @property {(record: any) => record is T} validate
 * @property {<H>(record: Omit<T, 'handle'>, handle: H = harden({})) => H} create
 * @property {(handle: any) => T & {handle: {}}} get
 * @property {(handle: any) => boolean} has
 * @property {(handle: any) => void} delete
 * @property {<H>(handle: H, partialRecord: Partial<T>) => H} update
 */

/**
 * @typedef {Object} ZoeSeat
 * @property {() => void} exit - exit seat
 * @property {(replacementAllocation: Allocation) => void} replaceAllocation - replace the
 * currentAllocation with this allocation
 */

/**
 * @typedef {Object} ZCFSeatAdmin
 * @property {(seatStaging: SeatStaging) => void} commit
 */

/**
 * @typedef {Object} SeatData
 * @property {ProposalRecord} proposal
 * @property {Notifier<Allocation>} notifier
 * @property {Allocation} initialAllocation
 */

/**
 * Make the ZCF seat and seat admin
 * @callback MakeSeatAdmin
 * @param {Set<SeatStaging>} allSeatStagings - a set of valid
 * seatStagings where allocations have been checked for offerSafety
 * @param {ZoeSeat} zoeSeat - a presence from Zoe such that ZCF can tell Zoe
 * about seat events
 * @param {SeatData} seatData - pass-by-copy data to use to make the seat
 * @param {(brand: Brand) => AmountMath} getAmountMath
 * @returns {{seatAdmin: ZCFSeatAdmin, seat: ZCFSeat}}
 */

/**
 * @typedef {Object} AddSeatResult
 * @property {Promise<any>} offerResultP
 * @property {Object} exitObj
 */

/**
 * @typedef {Object} InstanceAdmin
 * @property {(invitationHandle: InvitationHandle, seatAdmin:
 * ZoeSeat, seatData: SeatData) => Promise<AddSeatResult>} addSeatAdmin
 * @property {(seatAdmin: ZoeSeat) => void} removeSeatAdmin
 * @property {() => Instance} getInstance
 * @property {() => PublicFacet} getPublicFacet
 * @property {() => IssuerKeywordRecord} getIssuers
 * @property {() => BrandKeywordRecord} getBrands
 * @property {() => Object} getTerms
 */

/**
 * @typedef {Object} AddSeatObj
 * @property {(invitationHandle, zoeSeat, seatData) => AddSeatResult} addSeat
 */

/**
 * @typedef {Object} ZoeInstanceAdmin
 * @property {(invitationHandle: InvitationHandle, description:
 * string, customProperties?: {}) => Payment<'ZoeInvitation'>}
 * makeInvitation
 * @property {() => void} shutdown
 * @property {(issuerP: Issuer|Promise<Issuer>, keyword: Keyword) => void} saveIssuer
 */

/**
 * @typedef {Object} InstanceData
 */

/**
 * @typedef {Object} ZCFRoot
 * @property {ExecuteContract} executeContract
 *
 * @typedef {Object} ExecuteContractResult
 * @property {Object} creatorFacet
 * @property {Promise<Invitation>} creatorInvitation
 * @property {Object} publicFacet
 * @property {AddSeatObj} addSeatObj
 *
 *
 * @callback ExecuteContract
 * @param {SourceBundle} bundle
 * @param {ZoeService} zoeService
 * @param {Issuer<'ZoeInvitation'>} invitationIssuer
 * @param {ZoeInstanceAdmin} zoeInstanceAdmin
 * @param {InstanceRecord} instanceRecord
 * @returns {ExecuteContractResult}
 *
 */

/**
 * @callback MakeMakeInstanceFn
 * @param {VatAdminSvc} vatAdminSvc,
 * @param {GetPromiseForIssuerRecord} getPromiseForIssuerRecord,
 * @param {IssuerKit<'ZoeInvitation'>} invitationKit,
 * @param {HasInstallation} hasInstallation,
 * @param {ZoeService} zoeService,
 * @param {AddInstance} addInstance,
 * @returns MakeInstance
 */

/**
 * @callback MakeExitObj
 * @param {ProposalRecord} proposal
 * @param {ZoeSeat} zoeSeat
 */

/**
 * @typedef {Object} ExitObj
 * @property {() => void} exit
 */
