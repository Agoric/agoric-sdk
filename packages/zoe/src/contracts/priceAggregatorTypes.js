/**
 * @template {object} R Result type
 * @typedef {object} OracleAdmin
 * @property {() => Promise<void>} delete
 * Remove the oracle from the aggregator
 * @property {(result: R) => Promise<void>} pushResult
 * Rather than waiting for the polling query, push a result directly from this oracle
 */

/**
 * @typedef {{} | string} OracleKey
 */

/**
 * @typedef {Pick<import("./priceAggregator").PriceAggregatorContract, 'creatorFacet' | 'publicFacet'>} PriceAggregatorKit
 */

/**
 * @typedef {Record<string, unknown> & {
 * kind?: string,
 * increment?: bigint,
 * }} OracleQuery
 */

/**
 * @typedef {object} OraclePublicFacet
 * The public methods accessible from the contract instance
 * @property {(query: OracleQuery) => ERef<Invitation>} makeQueryInvitation
 * Create an invitation for an oracle query
 * @property {(query: OracleQuery) => ERef<unknown>} query
 * Make an unpaid query
 */

/**
 * @callback OracleCreatorFacetMakeWithdrawInvitation
 * @param {boolean} [total]
 * @returns {ERef<Invitation>}
 */

/**
 * @typedef {object} OracleCreatorFacet
 * The private methods accessible from the contract instance
 * @property {() => AmountKeywordRecord} getCurrentFees
 * Get the current fee amounts
 * @property {OracleCreatorFacetMakeWithdrawInvitation} makeWithdrawInvitation
 * Create an invitation to withdraw fees
 * @property {() => Promise<Invitation>} makeShutdownInvitation
 * Make an invitation to withdraw all fees and shutdown
 */

/**
 * @typedef {object} OraclePrivateParameters
 * @property {OracleHandler} oracleHandler
 */

/**
 * @typedef {object} OracleInitializationFacet
 * @property {(privateParams: OraclePrivateParameters
 * ) => OracleCreatorFacet} initialize
 */

/**
 * @typedef {object} OracleKit
 * @property {OracleCreatorFacet} creatorFacet
 * @property {OraclePublicFacet} publicFacet
 * @property {Instance} instance
 */

/**
 * @typedef {object} OracleReply
 * @property {unknown} reply
 * @property {Amount} [requiredFee]
 */

/**
 * @typedef {object} OracleHandler
 * @property {(query: OracleQuery, fee: Amount) => Promise<OracleReply>} onQuery
 * Callback to reply to a query
 * @property {(query: OracleQuery, reason: unknown) => void} onError
 * Notice an error
 * @property {(query: OracleQuery,
 *             reply: unknown,
 *             requiredFee: Amount | undefined
 * ) => void} onReply
 * Notice a successful reply
 */
