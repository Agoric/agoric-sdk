// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

/**
 * @callback Trade
 * Trade between left and right so that left and right end up with
 * the declared gains.
 * @param {ContractFacet} zcf
 * @param {SeatGainsLossesRecord} keepLeft
 * @param {SeatGainsLossesRecord} tryRight
 * @returns {void}
 *
 * @typedef {Object} SeatGainsLossesRecord
 * @property {ZCFSeat} seat
 * @property {AmountKeywordRecord} gains - what the offer will
 * gain as a result of this trade
 * @property {AmountKeywordRecord=} losses - what the offer will
 * give up as a result of this trade. Losses is optional, but can
 * only be omitted if the keywords for both offers are the same.
 * If losses is not defined, the gains of the other offer is
 * subtracted.
 */
