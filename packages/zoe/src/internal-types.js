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
 * @template T
 * @typedef {(record: any) => record is T} Validator
 */

/**
 * @typedef {Object} ZoeForZcf
 * @property {<OC>(inviteHandler: InviteHandler<OC>, inviteDesc: string, options?: MakeInvitationOptions) => Invite<OC>} makeInvitation
 * @property {(offerHandles: OfferHandle[], reallocations: Allocation[]) => OfferHandle[]} updateAmounts
 * @property {(publicAPI: PublicAPI) => void} updatePublicAPI
 * @property {(issuerP: ERef<Issuer>, keyword: Keyword) => Promise<void>} addNewIssuer
 * @property {(offerHandles: OfferHandle[]) => void} completeOffers
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
 * @typedef {Object} ZoeSeatAdmin
 * @property {() => void} exit - exit seat
 * @property {(replacementAllocation: Allocation) => void} replaceAllocation
 * - replace the currentAllocation with this allocation
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
 * @param {WeakSet<SeatStaging>} allSeatStagings - a set of valid
 * seatStagings where allocations have been checked for offerSafety
 * @param {ZoeSeatAdmin} zoeSeatAdmin
 * - a presence from Zoe such that ZCF can tell Zoe
 * about seat events
 * @param {SeatData} seatData - pass-by-copy data to use to make the seat
 * @param {(brand: Brand) => AmountMath} getAmountMath
 * @returns {{zcfSeatAdmin: ZCFSeatAdmin, zcfSeat: ZCFSeat}}
 */

/**
 * @typedef {Object} AddSeatResult
 * @property {Promise<any>} offerResultP
 * @property {Object} exitObj
 */

/**
 * @typedef {Object} InstanceAdmin
 * @property {(invitationHandle: InvitationHandle,
 *             zoeSeatAdmin: ZoeSeatAdmin,
 *             seatData: SeatData,
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
 * @typedef {Object} AddSeatObj
 * @property {(invitationHandle: InvitationHandle,
 *             zoeSeatAdmin: ZoeSeatAdmin,
 *             seatData: SeatData,
 *            ) => AddSeatResult} addSeat
 */

/**
 * @typedef {Object} ZoeInstanceAdmin
 * @property {(invitationHandle: InvitationHandle,
 *             description: string,
 *             customProperties?: {},
 *            ) => Payment<'ZoeInvitation'>} makeInvitation
 * @property {() => void} shutdown
 * @property {(issuerP: ERef<Issuer>, keyword: Keyword) => void} saveIssuer
 *
 * @property {MakeZoeMint} makeZoeMint
 */

/**
 * @callback MakeZoeMint
 * @param {Keyword} keyword
 * @param {MathHelpersName=} mathHelperName
 * @returns {ZoeMint}
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
 * @param {ZoeSeatAdmin} zoeSeatAdmin
 */

/**
 * @typedef {Object} ExitObj
 * @property {() => void} exit
 */
