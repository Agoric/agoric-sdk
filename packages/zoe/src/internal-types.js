/**
 * @template T
 * @typedef {import('@agoric/promise-kit').ERef<T>} ERef
 */

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
 * @typedef {import('@agoric/promise-kit').PromiseRecord<T>} PromiseRecord
 */

/**
 * @typedef {Object} SeatData
 * @property {ProposalRecord} proposal
 * @property {Notifier<Allocation>} notifier
 * @property {Allocation} initialAllocation
 */

/**
 * @typedef {Object} ZoeSeatAdminKit
 * @property {UserSeat} userSeat
 * @property {ZoeSeatAdmin} zoeSeatAdmin
 * @property {Notifier} notifier
 *
 * @callback MakeZoeSeatAdminKit
 * Make the Zoe seat admin, user seat and a notifier
 * @param {Allocation} initialAllocation
 * @param {InstanceAdmin} instanceAdmin
 * @param {ProposalRecord} proposal
 * @param {WeakStore<Brand, ERef<Purse>>} brandToPurse
 * @param {ERef<OfferResult>=} offerResult
 * @param {ERef<ExitObj>=} exitObj
 * @returns {ZoeSeatAdminKit}
 *
 * @typedef {Object} ZoeSeatAdmin
 * @property {(allocation: Allocation) => void} replaceAllocation
 * @property {() => void} exit
 * @property {(reason: any) => never} kickOut called with the reason this seat
 * is being kicked out, where reason is normally an instanceof Error.
 * @property {() => Allocation} getCurrentAllocation
 */

/**
 * @callback MakeZcfSeatAdminKit
 * Make the ZCF seat and seat admin
 * @param {WeakSet<SeatStaging>} allSeatStagings - a set of valid
 * seatStagings where allocations have been checked for offerSafety
 * @param {ERef<ZoeSeatAdmin>} zoeSeatAdmin
 * - a presence from Zoe such that ZCF can tell Zoe
 * about seat events
 * @param {SeatData} seatData - pass-by-copy data to use to make the seat
 * @param {GetAmountMath} getAmountMath
 * @returns {ZcfSeatAdminKit}
 */

/**
 * @typedef {{zcfSeatAdmin: ZCFSeatAdmin, zcfSeat: ZCFSeat}} ZcfSeatAdminKit
 */

/** @typedef {Object} ZCFSeatAdmin
 * @property {(seatStaging: SeatStaging) => void} commit
 * @property {() => void} updateHasExited - updates `exited` state to true
 */

/**
 * @typedef {Object} AddSeatResult
 * @property {Promise<any>} offerResultP
 * @property {Object} exitObj
 */

/**
 * The seatHandle may be created in either the Zoe or ZCF vat,
 * depending on whether the seat comes from a normal offer or a
 * request by the contract for an "empty" seat.
 *
 * @typedef {Object} InstanceAdmin
 * @property {(invitationHandle: InvitationHandle,
 *             zoeSeatAdmin: ZoeSeatAdmin,
 *             seatData: SeatData,
 *             seatHandle: SeatHandle,
 *            ) => Promise<AddSeatResult>} addZoeSeatAdmin
 * @property {(zoeSeatAdmin: ZoeSeatAdmin) => boolean} hasZoeSeatAdmin
 * @property {(zoeSeatAdmin: ZoeSeatAdmin) => void} removeZoeSeatAdmin
 * @property {() => Instance} getInstance
 * @property {() => PublicFacet} getPublicFacet
 * @property {() => IssuerKeywordRecord} getIssuers
 * @property {() => BrandKeywordRecord} getBrands
 * @property {() => Object} getTerms
 */

/**
 * The seatHandle may be created in either the Zoe or ZCF vat,
 * depending on whether the seat comes from a normal offer or a
 * request by the contract for an "empty" seat.
 *
 * @typedef {Object} AddSeatObj
 * @property {(invitationHandle: InvitationHandle,
 *             zoeSeatAdmin: ZoeSeatAdmin,
 *             seatData: SeatData,
 *             seatHandle: SeatHandle,
 *            ) => AddSeatResult} addSeat
 */

/**
 * @typedef {Object} ZoeInstanceAdmin
 * @property {(invitationHandle: InvitationHandle,
 *             description: string,
 *             customProperties?: {},
 *            ) => Payment} makeInvitation
 * @property {() => void} shutdown
 * @property {(issuerP: ERef<Issuer>,
 *             keyword: Keyword
 *            ) => Promise<void>} saveIssuer
 * @property {MakeZoeMint} makeZoeMint
 * @property {MakeOfferlessSeat} makeOfferlessSeat
 * @property {ReplaceAllocations} replaceAllocations
 */

/**
 * @callback MakeZoeMint
 * @param {Keyword} keyword
 * @param {AmountMathKind=} amountMathKind
 * @returns {ZoeMint}
 */

/**
 * @callback MakeOfferlessSeat
 * @param {Allocation} initialAllocation
 * @param {ProposalRecord} proposal
 * @param {SeatHandle} seatHandle
 * @returns {ZoeSeatAdminKit}
 */

/**
 * @callback ReplaceAllocations
 * @param {SeatHandleAllocation[]} seatHandleAllocations
 */

/**
 * @typedef {Object} SeatHandleAllocation
 * @property {SeatHandle} seatHandle
 * @property {Allocation} allocation
 */

/**
 * @typedef {Object} ZoeMint
 * @property {() => IssuerRecord} getIssuerRecord
 * @property {(totalToMint: Amount) => void} mintAndEscrow
 * @property {(totalToBurn: Amount) => void} withdrawAndBurn
 * Note that the burning is asynchronous, and so may not have happened by
 * the time withdrawAndBurn returns. We rely on our other bookkeeping so that
 * these assets are assumed burned elsewhere, so no one will try to access
 * them even before they are actually burned.
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
 * @param {Issuer} invitationIssuer
 * @param {ZoeInstanceAdmin} zoeInstanceAdmin
 * @param {InstanceRecord} instanceRecord
 * @returns {ExecuteContractResult}
 *
 */

/**
 * @callback MakeExitObj
 * @param {ProposalRecord} proposal
 * @param {ZoeSeatAdmin} zoeSeatAdmin
 * @param {ZCFSeatAdmin} zcfSeatAdmin
 */

/**
 * @typedef {Object} ExitObj
 * @property {() => void} exit
 */

/**
 * @typedef {Object} IssuerTable
 * @propert {(brand: Brand) => boolean} hasByBrand
 * @property {(brand: Brand) => IssuerRecord} getByBrand
 * @property {(issuer: Issuer) => boolean} hasByIssuer
 * @property {(issuer: Issuer) => IssuerRecord} getByIssuer
 * @property {(issuerP: ERef<Issuer>) => Promise<IssuerRecord>} initIssuer
 * @property {(issuerRecord: IssuerRecord) => void } initIssuerByRecord
 */

/**
 * @typedef {Handle<'SeatHandle'>} SeatHandle
 */
