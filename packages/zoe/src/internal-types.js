/**
 * @template T
 * @typedef {import('@agoric/promise-kit').ERef<T>} ERef
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
 * Given an allocation, withdraw payments to create a payout
 *
 * @callback WithdrawPayments
 * @param {Allocation} allocation
 * @returns {PaymentPKeywordRecord}
 */

/**
 * @typedef {Object} ZoeSeatAdminKit
 * @property {UserSeat} userSeat
 * @property {ZoeSeatAdmin} zoeSeatAdmin
 * @property {Notifier<Allocation>} notifier
 *
 * @callback MakeZoeSeatAdminKit
 * Make the Zoe seat admin, user seat and a notifier
 * @param {Allocation} initialAllocation
 * @param {(zoeSeatAdmin: ZoeSeatAdmin) => void} exitZoeSeatAdmin
 * @param {(zoeSeatAdmin: ZoeSeatAdmin) => boolean} hasExited
 * @param {ProposalRecord} proposal
 * @param {WithdrawPayments} withdrawPayments
 * @param {ERef<ExitObj>} exitObj
 * @param {ERef<OfferResult>=} offerResult
 * @returns {ZoeSeatAdminKit}
 */

/**
 * @callback ZoeSeatAdminExit
 * @param {Completion=} completion
 * @returns {void}
 */

/**
 * @typedef {Object} ZoeSeatAdmin
 * @property {(allocation: Allocation) => void} replaceAllocation
 * @property {ZoeSeatAdminExit} exit
 * @property {(reason: TerminationReason) => void} fail called with the reason
 * for calling fail on this seat, where reason is normally an instanceof Error.
 * @property {() => Allocation} getCurrentAllocation
 */

/**
 * @callback {(brand: Brand) => AmountMathKind} GetMathKind
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
 * @param {GetMathKindByBrand} getMathKindByBrand - get the mathKind given the brand
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
 * @property {() => void} assertAcceptingOffers
 * @property {(invitationHandle: InvitationHandle,
 *     initialAllocation: Allocation,
 *     proposal: ProposalRecord) => Promise<UserSeat> } makeUserSeat
 * @property {(initialAllocation: Allocation,
 *     proposal: ProposalRecord,
 *     exitObj: ExitObj,
 *     seatHandle: SeatHandle) => foo } makeNoEscrowSeat
 * @property {() => Instance} getInstance
 * @property {() => Object} getPublicFacet
 * @property {() => IssuerKeywordRecord} getIssuers
 * @property {() => BrandKeywordRecord} getBrands
 * @property {() => Object} getTerms
 * @property {(completion: Completion) => void} exitAllSeats
 * @property {(reason: TerminationReason) => void} failAllSeats
 * @property {() => void} stopAcceptingOffers
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
 * @callback ZoeInstanceAdminMakeInvitation
 * @param invitationHandle: InvitationHandle,
 * @param description: string,
 * @param customProperties: Record<string, any>=,
 * @returns {Payment}
 */

/**
 * @typedef {Object} ZoeInstanceAdmin
 * @property {ZoeInstanceAdminMakeInvitation} makeInvitation
 * @property {(issuerP: ERef<Issuer>,
 *             keyword: Keyword
 *            ) => Promise<IssuerRecord>} saveIssuer
 * @property {MakeZoeMint} makeZoeMint
 * @property {MakeNoEscrowSeat} makeNoEscrowSeat
 * @property {ReplaceAllocations} replaceAllocations
 * @property {(completion: Completion) => void} exitAllSeats
 * @property {(reason: TerminationReason) => void} failAllSeats
 * @property {() => void} stopAcceptingOffers
 */

/**
 * @callback MakeZoeMint
 * @param {Keyword} keyword
 * @param {AmountMathKind=} amountMathKind
 * @param {DisplayInfo=} displayInfo
 * @returns {ZoeMint}
 */

/**
 * @callback MakeNoEscrowSeat
 * @param {Allocation} initialAllocation
 * @param {ProposalRecord} proposal
 * @param {ExitObj} exitObj
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
 * @param {ExportedIssuerStorage} issuerStorageFromZoe
 * @returns {Promise<ExecuteContractResult>}
 *
 */

/**
 * @callback MakeExitObj
 * @param {ProposalRecord} proposal
 * @param {ERef<ZoeSeatAdmin>} zoeSeatAdmin
 * @param {ZCFSeatAdmin} zcfSeatAdmin
 * @returns {ExitObj}
 */

/**
 * @typedef {Object} ExitObj
 * @property {() => void} exit
 */

/**
 * @typedef {Handle<'SeatHandle'>} SeatHandle
 */

/**
 * @typedef RootAndAdminNode
 * @property {Object} root
 * @property {AdminNode} adminNode
 */

/**
 * @typedef {Object} AdminNode
 * A powerful object that can be used to terminate the vat in which a contract
 * is running, to get statistics, or to be notified when it terminates.
 *
 * @property {() => Promise<Completion>} done
 * returns a promise that will be fulfilled or rejected when the contract is
 * terminated. If the contract terminates with a failure, the promise will be
 * rejected with the reason. If the contract terminates successfully, the
 * promise will fulfill to the completion value.
 * @property {(reason: TerminationReason) => void} terminateWithFailure
 * Terminate the vat in which the contract is running as a failure.
 * @property {() => Object} adminData
 * returns some statistics about the vat in which the contract is running.
 */

/**
 * @callback GetAmountOfInvitationThen
 * Get the amount of an invitation and then call the `onFulfilled`
 * function. If the invitation is not a Zoe invitation, the promise
 * rejects with a helpful error message and `onFulfilled` is not called.
 * @param {ERef<Invitation>} invitationP
 * @param {(amount: Amount) => any} onFulfilled
 * @returns {any} the result of `onFulfilled`
 */

/**
 * @callback GetMathKindByBrand
 * Get the mathKind for a brand known by Zoe
 *
 * To be deleted when brands have a property for mathKind
 *
 * @param {Brand} brand
 * @returns {AmountMathKind}
 */

/**
 * @typedef {Array<IssuerRecord>} ExportedIssuerStorage
 */
