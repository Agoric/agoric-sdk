// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

/**
 * @callback Trade
 * Trade between left and right so that left and right end up with
 * the declared gains and losses.
 * @param {ContractFacet} zcf
 * @param {SeatGainsLossesRecord} left
 * @param {SeatGainsLossesRecord} right
 * @param {string} [leftHasExitedMsg] A custom error message if
 * the left seat has been exited already
 * @param {string} [rightHasExitedMsg] A custom error message if the
 * right seat has been exited already
 * @returns {void}
 *
 * @typedef {Object} SeatGainsLossesRecord
 * @property {ZCFSeat} seat
 * @property {AmountKeywordRecord} gains - what the seat will
 * gain as a result of this trade
 * @property {AmountKeywordRecord=} losses - what the seat will
 * give up as a result of this trade. Losses is optional, but can
 * only be omitted if the keywords for both seats are the same.
 * If losses is not defined, the gains of the other seat is
 * subtracted.
 */

/**
 * @callback Swap
 * If two seats can satisfy each other's wants, trade enough to
 * satisfy the wants of both seats and exit both seats.
 *
 * The surplus remains with the original seat. For example if seat A
 * gives 5 moola and seat B only wants 3 moola, seat A retains 2
 * moola.
 *
 * If leftSeat has exited already, both seats will fail
 * with an error message (provided by 'leftHasExitedMsg'). Similarly,
 * if rightSeat has exited already, both seats fail
 * with an error message (provided by 'rightHasExitedMsg').
 *
 * If the swap fails, no assets are transferred, both seats will fail,
 * and the function throws.
 *
 * @param {ContractFacet} zcf
 * @param {ZCFSeat} leftSeat
 * @param {ZCFSeat} rightSeat
 * @param {string} [leftHasExitedMsg]
 * @param {string} [rightHasExitedMsg]
 * @returns {string}
 */

/**
 * @typedef {Object} OfferToReturns
 *
 * The return value of offerTo is a promise for the userSeat for the
 * offer to the other contract, and a promise (`deposited`) which
 * resolves when the payout for the offer has been deposited to the `toSeat`
 * @property {Promise<UserSeat>} userSeatPromise
 * @property {Promise<AmountKeywordRecord>} deposited
 */

/**
 * @typedef {Record<Keyword,Keyword>} KeywordKeywordRecord
 *
 * A mapping of keywords to keywords.
 */

/**
 * @callback OfferTo
 *
 * Make an offer to another contract instance (labeled contractB below),
 * withdrawing the payments for the offer from a seat in the current
 * contract instance (contractA) and depositing the payouts in another
 * seat in the current contract instance (contractA).
 *
 * @param {ContractFacet} zcf
 *   Zoe Contract Facet for contractA
 *
 * @param {ERef<Invitation>} invitation
 *   Invitation to contractB
 *
 * @param {KeywordKeywordRecord=} keywordMapping
 *   Mapping of keywords used in contractA to keywords to be used in
 *   contractB. Note that the pathway to deposit the payout back to
 *   contractA reverses this mapping.
 *
 * @param {Proposal} proposal
 *   The proposal for the offer to be made to contractB
 *
 * @param {ZCFSeat} fromSeat
 *   The seat in contractA to take the offer payments from.
 *
 * @param {ZCFSeat=} toSeat
 *   The seat in contractA to deposit the payout of the offer to.
 *   If `toSeat` is not provided, this defaults to the `fromSeat`.
 *
 * @returns {OfferToReturns}
 */

/**
 * @callback Reverse
 *
 * Given a mapping of keywords to keywords, invert the keys and
 * values. This is used to map the offers made to another contract
 * back to the keywords used in the first contract.
 * @param {KeywordKeywordRecord=} keywordRecord
 * @returns {KeywordKeywordRecord }
 */

/**
 * @callback MapKeywords
 *
 * Remap the keywords of an amountKeywordRecord or a
 * PaymentPKeywordRecord according to a mapping. This is used to remap
 * from keywords used in contractA to keywords used in contractB and
 * vice versa in `offerTo`
 *
 * @param {AmountKeywordRecord | PaymentPKeywordRecord | undefined }
 * keywordRecord
 * @param {KeywordKeywordRecord} keywordMapping
 */

/**
 * @typedef {Object} Ratio
 * @property {Amount} numerator
 * @property {Amount} denominator
 */

/**
 * @callback MakeRatio
 * @param {bigint} numerator
 * @param {Brand} numeratorBrand
 * @param {bigint=} denominator The default denomiator is 100
 * @param {Brand=} denominatorBrand The default is to reuse the numeratorBrand
 * @returns {Ratio}
 */

/**
 * @callback MakeRatioFromAmounts
 * @param {Amount} numerator
 * @param {Amount} denominator
 * @returns {Ratio}
 */

/**
 * @callback MultiplyBy
 * @param {Amount} amount
 * @param {Ratio} ratio
 * @returns {amount}
 */

/**
 * @callback DivideBy
 * @param {Amount} amount
 * @param {Ratio} ratio
 * @returns {amount}
 */

/**
 * @callback InvertRatio
 * @param {Ratio} ratio
 * @returns {Ratio}
 */
