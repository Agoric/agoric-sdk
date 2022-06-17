// @ts-check
/**
 * @typedef {object} SeatData
 * @property {ProposalRecord} proposal
 * @property {Notifier<Allocation>} notifier
 * @property {Allocation} initialAllocation
 * @property {SeatHandle} seatHandle
 * @property {object=} offerArgs
 */

/**
 * Given an allocation, withdraw payments to create a payout
 *
 * @callback WithdrawPayments
 * @param {Allocation} allocation
 * @returns {PaymentPKeywordRecord}
 */

/**
 * @typedef {object} ZoeSeatAdminKit
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
 * @param {ERef<unknown>} [offerResult]
 * @returns {ZoeSeatAdminKit}
 */

/**
 * @callback ZoeSeatAdminExit
 * @param {Completion=} completion
 * @returns {void}
 */

/**
 * @typedef {object} ZoeSeatAdmin
 * @property {(allocation: Allocation) => void} replaceAllocation
 * @property {ZoeSeatAdminExit} exit
 * @property {ShutdownWithFailure} fail called with the reason
 * for calling fail on this seat, where reason is normally an instanceof Error.
 */

/**
 * @callback {(brand: Brand) => AssetKind} GetAssetKind
 */

/**
 * @typedef {object} HandleOfferResult
 * @property {Promise<any>} offerResultP
 * @property {object} exitObj
 */

/**
 * The seatHandle may be created in either the Zoe or ZCF vat,
 * depending on whether the seat comes from a normal offer or a
 * request by the contract for an "empty" seat.
 *
 * @typedef {object} InstanceAdmin
 * @property {() => void} assertAcceptingOffers
 * @property {(invitationHandle: InvitationHandle,
 *     initialAllocation: Allocation,
 *     proposal: ProposalRecord,
 *     offerArgs?: object,
 * ) => UserSeat } makeUserSeat
 * @property {MakeNoEscrowSeat} makeNoEscrowSeat
 * @property {() => Instance} getInstance
 * @property {() => object} getPublicFacet
 * @property {() => IssuerKeywordRecord} getIssuers
 * @property {() => BrandKeywordRecord} getBrands
 * @property {() => object} getTerms
 * @property {() => Installation} getInstallationForInstance
 * @property {(completion: Completion) => void} exitAllSeats
 * @property {ShutdownWithFailure} failAllSeats
 * @property {() => void} stopAcceptingOffers
 */

/**
 * The seatHandle may be created in either the Zoe or ZCF vat,
 * depending on whether the seat comes from a normal offer or a
 * request by the contract for an "empty" seat.
 *
 * @typedef {object} HandleOfferObj
 * @property {(invitationHandle: InvitationHandle,
 *             zoeSeatAdmin: ZoeSeatAdmin,
 *             seatData: SeatData,
 *            ) => HandleOfferResult} handleOffer
 */

/**
 * @callback ZoeInstanceAdminMakeInvitation
 * @param {InvitationHandle} invitationHandle
 * @param {string} description
 * @param {Record<string, any>=} customProperties
 * @param {Pattern} [proposalSchema]
 * @returns {Payment}
 */

/**
 * @typedef {object} ZoeInstanceAdmin
 * @property {ZoeInstanceAdminMakeInvitation} makeInvitation
 * @property {(issuerP: ERef<Issuer>,
 *             keyword: Keyword
 *            ) => Promise<IssuerRecord>} saveIssuer
 * @property {MakeZoeMint} makeZoeMint
 * @property {RegisterFeeMint} registerFeeMint
 * @property {MakeNoEscrowSeat} makeNoEscrowSeat
 * @property {ReplaceAllocations} replaceAllocations
 * @property {(completion: Completion) => void} exitAllSeats
 * @property {ShutdownWithFailure} failAllSeats
 * @property {() => void} stopAcceptingOffers
 */

/**
 * @callback RegisterFeeMint
 * @param {Keyword} keyword - the keyword to use for the issuer
 * @param {FeeMintAccess} allegedFeeMintAccess - an object that
 * purports to be the object that allows access to the feeMint
 * @returns {ZoeMint}
 */

/**
 * @callback WrapIssuerKitWithZoeMint
 * @param {Keyword} keyword - the keyword to use for the issuer
 * @param {IssuerKit} localIssuerKit - an issuer kit that originates
 * within Zoe
 */

/**
 * @callback MakeZoeMint
 * @param {Keyword} keyword
 * @param {AssetKind=} assetKind
 * @param {AdditionalDisplayInfo=} displayInfo
 * @param {Partial<{elementSchema: Pattern}>} [options]
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
 * @typedef {object} SeatHandleAllocation
 * @property {SeatHandle} seatHandle
 * @property {Allocation} allocation
 */

/**
 * @typedef {object} ZoeMint
 * @property {() => IssuerRecord} getIssuerRecord
 * @property {(totalToMint: Amount) => void} mintAndEscrow
 * @property {(totalToBurn: Amount) => void} withdrawAndBurn
 * Note that the burning is asynchronous, and so may not have happened by
 * the time withdrawAndBurn returns. We rely on our other bookkeeping so that
 * these assets are assumed burned elsewhere, so no one will try to access
 * them even before they are actually burned.
 */

/**
 * @typedef {object} ZCFRoot
 * @property {ExecuteContract} executeContract
 *
 * @typedef {object} ExecuteContractResult
 * @property {object} creatorFacet
 * @property {Promise<Invitation>} creatorInvitation
 * @property {object} publicFacet
 * @property {HandleOfferObj} handleOfferObj
 */

/**
 * @callback ExecuteContract
 * @param {SourceBundle} bundle
 * @param {ERef<ZoeService>} zoeService
 * @param {Issuer} invitationIssuer
 * @param {ERef<ZoeInstanceAdmin>} zoeInstanceAdmin
 * @param {InstanceRecord} instanceRecordFromZoe
 * @param {IssuerRecords} issuerStorageFromZoe
 * @param {object=} privateArgs
 * @returns {Promise<ExecuteContractResult>}
 */

/**
 * @callback MakeExitObj
 * @param {ProposalRecord} proposal
 * @param {ZCFSeat} zoeSeatAdmin
 * @returns {ExitObj}
 */

/**
 * @typedef {object} ExitObj
 * @property {() => void} exit
 */

/**
 * @typedef {Handle<'SeatHandle'>} SeatHandle
 */

/**
 * @typedef RootAndAdminNode
 * @property {object} root
 * @property {AdminNode} adminNode
 */

/**
 * @typedef {object} AdminNode
 * A powerful object that can be used to terminate the vat in which a contract
 * is running, to get statistics, or to be notified when it terminates.
 *
 * @property {() => Promise<Completion>} done
 * returns a promise that will be fulfilled or rejected when the contract is
 * terminated. If the contract terminates with a failure, the promise will be
 * rejected with the reason. If the contract terminates successfully, the
 * promise will fulfill to the completion value.
 * @property {ShutdownWithFailure} terminateWithFailure
 * Terminate the vat in which the contract is running as a failure.
 */

/**
 * @callback GetAssetKindByBrand
 * Get the assetKind for a brand known by Zoe
 *
 * To be deleted when brands have a property for assetKind
 *
 * @param {Brand} brand
 * @returns {AssetKind}
 */

/**
 * @typedef {Array<IssuerRecord>} IssuerRecords
 */

/**
 * @callback MakeZCFSeat
 * @param {ERef<ZoeSeatAdmin>} zoeSeatAdmin
 * @param {SeatData} seatData
 * @returns {ZCFSeat}
 */

/**
 * @callback DropAllReferences
 *
 * Drops all of the references in the seat-related weakStores by
 * dropping the stores
 * @returns {void}
 */

/**
 * @callback ReallocateForZCFMint
 * @param {ZCFSeat} zcfSeat
 * @param {Allocation} newAllocation
 * @returns {void}
 */

/**
 *
 * @callback CreateSeatManager
 *
 * The SeatManager holds the active zcfSeats and can reallocate and
 * make new zcfSeats.
 *
 * @param {ERef<ZoeInstanceAdmin>} zoeInstanceAdmin
 * @param {GetAssetKindByBrand} getAssetKindByBrand
 * @param {ShutdownWithFailure} shutdownWithFailure
 * @returns {{ makeZCFSeat: MakeZCFSeat,
    reallocate: Reallocate,
    reallocateForZCFMint: ReallocateForZCFMint,
    dropAllReferences: DropAllReferences }}
 */

/**
 * @callback AddIssuerToInstanceRecord
 *
 * Add an issuer and its keyword to the instanceRecord for the
 * contract instance
 *
 * @param {Keyword} keyword
 * @param {IssuerRecord} issuerRecord
 * @returns {void}
 */

/**
 * @callback InstanceRecordManagerGetTerms
 * @returns {AnyTerms}
 */

/**
 * @callback InstanceRecordManagerGetInstallationForInstance
 * @returns {Installation}
 */

/**
 * @callback InstanceRecordGetIssuers
 * @returns {IssuerKeywordRecord}
 */

/**
 * @callback InstanceRecordGetBrands
 * @returns {BrandKeywordRecord}
 */

/**
 * @typedef {object} InstanceRecordManager
 * @property {AddIssuerToInstanceRecord} addIssuerToInstanceRecord
 * @property {GetInstanceRecord} getInstanceRecord
 * @property {InstanceRecordManagerGetTerms} getTerms
 * @property {InstanceRecordManagerGetInstallationForInstance} getInstallationForInstance
 * @property {InstanceRecordGetIssuers} getIssuers
 * @property {InstanceRecordGetBrands} getBrands
 * @property {(keyword: Keyword) => void} assertUniqueKeyword
 * @property {(startingInstanceRecord: InstanceRecord) => void} instantiate
 */

/**
 * @callback GetInstanceRecord
 * @returns {InstanceRecord}
 */

/**
 * @callback IssuerStorageGetIssuerRecords
 * @param {Issuer[]} issuers
 * @returns {IssuerRecords}
 */
