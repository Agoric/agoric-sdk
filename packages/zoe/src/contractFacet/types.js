// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

/**
 * @typedef {any} Completion
 * Any passable non-thenable. Often an explanatory string.
 *
 * @typedef {Error|any} TerminationReason
 * Something provided as an explanation to a termination request. Usually an
 * Error but not required to be so.
 */

/**
 * @callback ZCFMakeEmptySeatKit
 * @param {ExitRule=} exit
 * @returns {ZCFSeatKit}
 */

/**
 * @callback GetAmountMath
 * @param {Brand} brand
 * @returns {DeprecatedAmountMath}
 */

/**
 * @typedef {Object} ContractFacet
 *
 * The Zoe interface specific to a contract instance. The Zoe Contract
 * Facet is an API object used by running contract instances to access
 * the Zoe state for that instance. The Zoe Contract Facet is accessed
 * synchronously from within the contract, and usually is referred to
 * in code as zcf.
 *
 * @property {Reallocate} reallocate - reallocate amounts among seats
 * @property {(keyword: Keyword) => void} assertUniqueKeyword - check
 * whether a keyword is valid and unique and could be added in
 * `saveIssuer`
 * @property {SaveIssuer} saveIssuer - save an issuer to ZCF and Zoe
 * and get the amountMath and brand synchronously accessible after
 * saving
 * @property {MakeInvitation} makeInvitation
 * @property {(completion: Completion) => void} shutdown
 * @property {(reason: TerminationReason) => void} shutdownWithFailure
 * @property {Assert} assert
 * @property {() => ZoeService} getZoeService
 * @property {() => Issuer} getInvitationIssuer
 * @property {() => Terms} getTerms
 * @property {(issuer: Issuer) => Brand} getBrandForIssuer
 * @property {(brand: Brand) => Issuer} getIssuerForBrand
 * @property {GetAmountMath} getAmountMath
 * @property {(brand: Brand) => AmountMathKind} getMathKind
 * @property {MakeZCFMint} makeZCFMint
 * @property {ZCFMakeEmptySeatKit} makeEmptySeatKit
 * @property {SetTestJig} setTestJig
 * @property {() => void} stopAcceptingOffers
 */

/**
 * @typedef {(seatStaging1: SeatStaging, seatStaging2: SeatStaging,
 * ...seatStagingRest: Array<SeatStaging>) => void} Reallocate
 *
 * The contract can reallocate over seatStagings, which are
 * associations of seats with reallocations.
 *
 * The reallocation will only succeed if the reallocation 1) conserves
 * rights (the amounts specified have the same total value as the
 * current total amount), and 2) is 'offer-safe' for all parties
 * involved. Offer safety is checked at the staging step.
 *
 * The reallocation is partial, meaning that it applies only to the
 * seats associated with the seatStagings. By induction, if rights
 * conservation and offer safety hold before, they will hold after a
 * safe reallocation, even though we only re-validate for the seats
 * whose allocations will change. Since rights are conserved for the
 * change, overall rights will be unchanged, and a reallocation can
 * only effect offer safety for seats whose allocations change.
 */

/**
 * @callback SaveIssuer
 *
 * Informs Zoe about an issuer and returns a promise for acknowledging
 * when the issuer is added and ready.
 *
 * @param {ERef<Issuer>} issuerP Promise for issuer
 * @param {Keyword} keyword Keyword for added issuer
 * @returns {Promise<IssuerRecord>} Issuer is added and ready
 */

/**
 * @callback MakeInvitation
 *
 * Make a credible Zoe invitation for a particular smart contract
 * indicated by the `instance` in the details of the invitation. Zoe
 * also puts the `installation` and a unique `handle` in the details of
 * the invitation. The contract must provide a `description` for the
 * invitation and should include whatever information is
 * necessary for a potential buyer of the invitation to know what they are
 * getting in the `customProperties`. `customProperties` will be
 * placed in the details of the invitation.
 *
 * @param {OfferHandler=} offerHandler - a contract specific function
 * that handles the offer, such as saving it or performing a trade
 * @param {string} description
 * @param {Object=} customProperties
 * @returns {Promise<Invitation>}
 */

/**
 * @callback MakeZCFMint
 * @param {Keyword} keyword
 * @param {AmountMathKind=} amountMathKind
 * @param {DisplayInfo=} displayInfo
 * @returns {Promise<ZCFMint>}
 */

/**
 * @callback SetTestJig
 * @param {() => any} testFn
 * @returns {void}
 */

/**
 * @callback ZCFMintMintGains
 * @param {AmountKeywordRecord} gains
 * @param {ZCFSeat=} zcfSeat
 * @returns {ZCFSeat}
 */

/**
 * @typedef {Object} ZCFMint
 * @property {() => IssuerRecord} getIssuerRecord
 * @property {ZCFMintMintGains} mintGains
 * All the amounts in gains must be of this ZCFMint's brand.
 * The gains' keywords are in the namespace of that seat.
 * Add the gains to that seat's allocation.
 * The resulting state must be offer safe. (Currently, increasing assets can
 * never violate offer safety anyway.)
 *
 * Mint that amount of assets into the pooled purse.
 * If a seat is provided, it is returned. Otherwise a new seat is
 * returned.
 * TODO unimplemented
 * This creation-on-demand is not yet implemented.
 *
 * @property {(losses: AmountKeywordRecord,
 *             zcfSeat: ZCFSeat,
 *            ) => void} burnLosses
 * All the amounts in losses must be of this ZCFMint's brand.
 * The losses' keywords are in the namespace of that seat.
 * Subtract losses from that seat's allocation.
 * The resulting state must be offer safe.
 *
 * Burn that amount of assets from the pooled purse.
 */

/**
 * @callback ZCFSeatFail
 *
 * fail called with the reason for this failure, where reason is
 * normally an instanceof Error.
 * @param {Error=} reason
 * @returns {Error}
 */
/**
 * @callback ZCFSeatKickOut
 *
 * called with the reason for this failure,
 * where reason is normally an instanceof Error. This method is
 * deprecated as of 0.9.1-dev.3 in favor of fail().
 * @param {Error=} reason
 * @returns {Error}
 */

/**
 * @callback ZCFGetAmountAllocated
 * The brand is used for filling in an empty amount if the `keyword`
 * is not present in the allocation
 * @param {Keyword} keyword
 * @param {Brand=} brand
 * @returns {Amount}
 */

/**
 * @typedef {Object} ZCFSeat
 * @property {() => void} exit
 * @property {ZCFSeatFail} fail
 * @property {ZCFSeatKickOut} kickOut
 * @property {() => Notifier<Allocation>} getNotifier
 * @property {() => boolean} hasExited
 * @property {() => ProposalRecord} getProposal
 * @property {ZCFGetAmountAllocated} getAmountAllocated
 * @property {() => Allocation} getCurrentAllocation
 * @property {(newAllocation: Allocation) => boolean} isOfferSafe
 * @property {(newAllocation: Allocation) => SeatStaging} stage
 */

/**
 * @typedef {Object} SeatStaging
 * @property {() => ZCFSeat} getSeat
 * @property {() => Allocation} getStagedAllocation
 */

/**
 * @typedef {{ zcfSeat: ZCFSeat, userSeat: ERef<UserSeat>}} ZcfSeatKit
 */

/**
 * @callback OfferHandler
 * @param {ZCFSeat} seat
 * @returns any
 */

/**
 * @callback ContractStartFn
 * @param {ContractFacet} zcf
 * @returns {ContractStartFnResult}
 */

/**
 * @typedef {Object} ContractStartFnResult
 * @property {Object=} creatorFacet
 * @property {Promise<Invitation>=} creatorInvitation
 * @property {Object=} publicFacet
 */
